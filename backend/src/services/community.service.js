import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

const SAFE_TRIP_SELECT = {
  id: true, name: true, description: true, startDate: true, endDate: true,
  budget: true, currency: true, coverImage: true, visibility: true,
  copiedFromTripId: true, createdAt: true,
  user: { select: { id: true, username: true, photoUrl: true } }, // no email/phone
  stops: {
    orderBy: { sequence: 'asc' },
    include: {
      city: { include: { country: true, state: true } },
      activities: {
        orderBy: [{ activityDate: 'asc' }, { sequence: 'asc' }],
        include: { activity: true },
        // estimatedCost is included, but expenses are never returned
      },
    },
  },
};

const paginate = (query) => {
  const page = Math.max(1, parseInt(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const getCommunityTrips = async (query) => {
  const { search, sort, countryId } = query;
  const { skip, take, page, limit } = paginate(query);

  const where = { visibility: 'PUBLIC' };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (countryId) {
    where.stops = { some: { city: { countryId } } };
  }

  const orderBy = sort === 'popular'
    ? { copies: { _count: 'desc' } }
    : { createdAt: 'desc' };

  const [data, total] = await prisma.$transaction([
    prisma.trip.findMany({ where, orderBy, skip, take, select: SAFE_TRIP_SELECT }),
    prisma.trip.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getCommunityTripById = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: SAFE_TRIP_SELECT,
  });

  // Non-public trips return 404 (never 403 — avoids confirming existence)
  if (!trip || trip.visibility !== 'PUBLIC') {
    throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
  }

  return trip;
};

export const copyTrip = async (tripId, userId, bodyData, idempotencyKey) => {
  const { name, startDate } = bodyData;

  // Check idempotency: if same key was used within 24h, return the existing copy
  if (idempotencyKey) {
    const existing = await prisma.trip.findFirst({
      where: {
        userId,
        copiedFromTripId: tripId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) return { tripId: existing.id, message: 'Trip already copied (idempotent).' };
  }

  // Fetch the original PUBLIC trip
  const original = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        include: {
          activities: true,
        },
      },
    },
  });

  if (!original || original.visibility !== 'PUBLIC') {
    throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
  }

  // Calculate date offset if startDate is provided
  const dateOffset = startDate
    ? new Date(startDate) - original.startDate
    : 0;

  const shiftDate = (d) => new Date(new Date(d).getTime() + dateOffset);

  // Full transactional copy: trip + stops + activities (no expenses)
  const newTrip = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        userId,
        name: name || original.name,
        description: original.description,
        startDate: shiftDate(original.startDate),
        endDate: shiftDate(original.endDate),
        budget: original.budget,
        currency: original.currency,
        coverImage: original.coverImage,
        visibility: 'PRIVATE', // copies are always PRIVATE
        copiedFromTripId: original.id,
      },
    });

    for (const stop of original.stops) {
      const newStop = await tx.tripStop.create({
        data: {
          tripId: trip.id,
          cityId: stop.cityId,
          sequence: stop.sequence,
          startDate: shiftDate(stop.startDate),
          endDate: shiftDate(stop.endDate),
          budget: stop.budget,
        },
      });

      for (const activity of stop.activities) {
        await tx.tripActivity.create({
          data: {
            stopId: newStop.id,
            activityId: activity.activityId,
            customName: activity.customName,
            description: activity.description,
            sequence: activity.sequence,
            activityDate: shiftDate(activity.activityDate),
            startMinute: activity.startMinute,
            durationMin: activity.durationMin,
            estimatedCost: activity.estimatedCost,
          },
        });
      }
    }

    return trip;
  });

  return { tripId: newTrip.id, message: 'Trip copied successfully.' };
};
