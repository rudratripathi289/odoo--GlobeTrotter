import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const paginate = (query) => {
  const page = Math.max(1, parseInt(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

/**
 * Resolve trip ownership/access per the authorization matrix (spec §2).
 * Returns the trip or throws 404 if the caller cannot see it.
 */
const resolveTripAccess = async (tripId, userId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { shares: { where: { userId } } },
  });

  if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');

  const isOwner = trip.userId === userId;
  const isShared = trip.shares.length > 0;

  if (trip.visibility === 'PRIVATE' && !isOwner) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
  if (trip.visibility === 'SHARED' && !isOwner && !isShared) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');

  return { trip, isOwner };
};

// ─── TRIPS ────────────────────────────────────────────────────────────────────

export const createTrip = async (userId, data) => {
  const { name, description, startDate, endDate, budget, currency } = data;

  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError(400, 'INVALID_DATES', 'endDate must be on or after startDate.');
  }

  return prisma.trip.create({
    data: {
      userId,
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: budget ? parseFloat(budget) : null,
      currency: currency || 'INR',
      visibility: 'PRIVATE',
    },
  });
};

export const getMyTrips = async (userId, query) => {
  const { status, search, sort } = query;
  const { skip, take, page, limit } = paginate(query);

  const now = new Date();
  const where = { userId };

  if (search) where.name = { contains: search, mode: 'insensitive' };

  if (status === 'UPCOMING') where.startDate = { gt: now };
  else if (status === 'ONGOING') {
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  } else if (status === 'COMPLETED') where.endDate = { lt: now };

  const orderBy = sort === 'createdAt' ? { createdAt: 'desc' } : { startDate: 'asc' };

  const [data, total] = await prisma.$transaction([
    prisma.trip.findMany({ where, orderBy, skip, take }),
    prisma.trip.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getSharedWithMeTrips = async (userId, query) => {
  const { skip, take, page, limit } = paginate(query);

  const where = { userId, trip: { visibility: { in: ['SHARED', 'PUBLIC'] } } };

  const [shares, total] = await prisma.$transaction([
    prisma.tripShare.findMany({
      where,
      include: { trip: true },
      skip,
      take,
    }),
    prisma.tripShare.count({ where }),
  ]);

  return {
    data: shares.map((s) => s.trip),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getTripById = async (tripId, userId) => {
  const { trip, isOwner } = await resolveTripAccess(tripId, userId);

  const full = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          city: true,
          activities: { orderBy: [{ activityDate: 'asc' }, { sequence: 'asc' }] },
          expenses: isOwner,
        },
      },
      expenses: isOwner,
      shares: isOwner ? { include: { user: { select: { id: true, username: true, email: true } } } } : false,
    },
  });

  return full;
};

export const updateTrip = async (tripId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can update this trip.');

  const { name, description, startDate, endDate, budget, currency, coverImage, visibility } = data;

  const newStart = startDate ? new Date(startDate) : trip.startDate;
  const newEnd = endDate ? new Date(endDate) : trip.endDate;

  if (newEnd < newStart) throw new AppError(400, 'INVALID_DATES', 'endDate must be on or after startDate.');

  // Check that narrowing dates doesn't push stops outside range
  if (startDate || endDate) {
    const offendingStops = await prisma.tripStop.findMany({
      where: {
        tripId,
        OR: [
          { startDate: { lt: newStart } },
          { endDate: { gt: newEnd } },
        ],
      },
    });
    if (offendingStops.length > 0) {
      throw new AppError(422, 'STOPS_OUTSIDE_TRIP_RANGE',
        'Trip date change would leave stops outside the new range.',
        offendingStops.map((s) => s.id)
      );
    }
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: newStart }),
      ...(endDate && { endDate: newEnd }),
      ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
      ...(currency && { currency }),
      ...(coverImage !== undefined && { coverImage }),
      ...(visibility && { visibility }),
    },
  });
};

export const deleteTrip = async (tripId, userId) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can delete this trip.');
  await prisma.trip.delete({ where: { id: tripId } });
};

// ─── VIEWS ────────────────────────────────────────────────────────────────────

export const getItinerary = async (tripId, userId) => {
  await resolveTripAccess(tripId, userId);

  return prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          city: { include: { country: true, state: true } },
          activities: { orderBy: [{ activityDate: 'asc' }, { sequence: 'asc' }], include: { activity: true } },
        },
      },
    },
  });
};

export const getBudget = async (tripId, userId) => {
  const { isOwner } = await resolveTripAccess(tripId, userId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        include: {
          city: true,
          activities: true,
          expenses: isOwner,
        },
      },
      expenses: isOwner,
    },
  });

  const activityCost = trip.stops.reduce((sum, stop) =>
    sum + stop.activities.reduce((s, a) => s + Number(a.estimatedCost || 0), 0), 0);

  const allExpenses = isOwner ? trip.expenses : [];
  const expenseByCategory = allExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const totalExpenses = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalEstimatedCost = activityCost + totalExpenses;
  const budget = Number(trip.budget || 0);
  const remaining = budget - totalEstimatedCost;

  const tripDays = Math.max(1, Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000));

  const byStop = trip.stops.map((stop) => {
    const stopActivity = stop.activities.reduce((s, a) => s + Number(a.estimatedCost || 0), 0);
    const stopExpenses = (isOwner ? stop.expenses : []).reduce((s, e) => s + Number(e.amount), 0);
    const total = stopActivity + stopExpenses;
    return {
      stopId: stop.id,
      city: stop.city.name,
      total,
      budget: Number(stop.budget || 0),
      overBudget: stop.budget ? total > Number(stop.budget) : false,
    };
  });

  // Group expenses by date for byDay
  const dayMap = {};
  trip.stops.forEach((stop) => {
    stop.activities.forEach((a) => {
      const d = a.activityDate.toISOString().split('T')[0];
      dayMap[d] = (dayMap[d] || 0) + Number(a.estimatedCost || 0);
    });
    if (isOwner) {
      stop.expenses.forEach((e) => {
        const d = e.expenseDate.toISOString().split('T')[0];
        dayMap[d] = (dayMap[d] || 0) + Number(e.amount);
      });
    }
  });
  const byDay = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));

  return {
    budget: trip.budget,
    currency: trip.currency,
    activityCost,
    expenseByCategory,
    totalEstimatedCost,
    remaining,
    withinBudget: remaining >= 0,
    averagePerDay: totalEstimatedCost / tripDays,
    byStop,
    byDay,
  };
};

export const getCalendar = async (tripId, userId) => {
  const { isOwner } = await resolveTripAccess(tripId, userId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          city: true,
          activities: { orderBy: [{ activityDate: 'asc' }, { sequence: 'asc' }], include: { activity: true } },
          expenses: isOwner,
        },
      },
    },
  });

  // Build a day-keyed map
  const dayMap = {};
  trip.stops.forEach((stop) => {
    stop.activities.forEach((a) => {
      const d = a.activityDate.toISOString().split('T')[0];
      if (!dayMap[d]) dayMap[d] = { date: d, stop: { id: stop.id, city: stop.city.name }, activities: [], expenses: [], dayTotal: 0 };
      dayMap[d].activities.push(a);
      dayMap[d].dayTotal += Number(a.estimatedCost || 0);
    });
    if (isOwner) {
      stop.expenses.forEach((e) => {
        const d = e.expenseDate.toISOString().split('T')[0];
        if (!dayMap[d]) dayMap[d] = { date: d, stop: { id: stop.id, city: stop.city.name }, activities: [], expenses: [], dayTotal: 0 };
        dayMap[d].expenses.push(e);
        dayMap[d].dayTotal += Number(e.amount);
      });
    }
  });

  return { days: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)) };
};

// ─── STOPS ────────────────────────────────────────────────────────────────────

export const createStop = async (tripId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can add stops.');

  const { cityId, startDate, endDate, budget } = data;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) throw new AppError(400, 'INVALID_DATES', 'Stop endDate must be on or after startDate.');
  if (start < trip.startDate || end > trip.endDate)
    throw new AppError(422, 'STOP_DATES_OUTSIDE_TRIP', 'Stop dates must be within trip date range.');

  // Check for overlapping stops
  const overlapping = await prisma.tripStop.findFirst({
    where: {
      tripId,
      AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
    },
  });
  if (overlapping) throw new AppError(422, 'STOP_DATES_OVERLAP', 'Stop dates overlap with an existing stop.');

  // Sequence = max + 1
  const maxSeq = await prisma.tripStop.aggregate({ where: { tripId }, _max: { sequence: true } });
  const sequence = (maxSeq._max.sequence || 0) + 1;

  return prisma.tripStop.create({
    data: { tripId, cityId, startDate: start, endDate: end, budget: budget ? parseFloat(budget) : null, sequence },
    include: { city: true },
  });
};

export const getStops = async (tripId, userId) => {
  await resolveTripAccess(tripId, userId);
  return prisma.tripStop.findMany({
    where: { tripId },
    orderBy: { sequence: 'asc' },
    include: { city: true },
  });
};

export const reorderStops = async (tripId, userId, stopIds) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can reorder stops.');

  const existing = await prisma.tripStop.findMany({ where: { tripId } });

  if (stopIds.length !== existing.length)
    throw new AppError(400, 'INCOMPLETE_ORDER', 'stopIds must contain every stop of the trip exactly once.');

  const existingIds = new Set(existing.map((s) => s.id));
  for (const id of stopIds) {
    if (!existingIds.has(id)) throw new AppError(404, 'STOP_NOT_FOUND', `Stop ${id} not found in this trip.`);
  }

  // Transactional renumber
  await prisma.$transaction(
    stopIds.map((id, index) =>
      prisma.tripStop.update({ where: { id }, data: { sequence: index + 1 } })
    )
  );

  const stops = await prisma.tripStop.findMany({
    where: { tripId },
    orderBy: { sequence: 'asc' },
    include: { city: true },
  });

  // Detect date ordering warnings
  const warnings = [];
  for (let i = 0; i < stops.length - 1; i++) {
    if (stops[i].startDate > stops[i + 1].startDate) {
      warnings.push({
        code: 'DATES_OUT_OF_SEQUENCE',
        message: `Stop ${i + 1} (${stops[i].city.name}) starts after stop ${i + 2} (${stops[i + 1].city.name}).`,
      });
    }
  }

  return { stops, warnings };
};

export const getStopById = async (tripId, stopId, userId) => {
  await resolveTripAccess(tripId, userId);
  const stop = await prisma.tripStop.findUnique({ where: { id: stopId }, include: { city: true } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');
  return stop;
};

export const updateStop = async (tripId, stopId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can update stops.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  const { startDate, endDate, budget } = data;
  const newStart = startDate ? new Date(startDate) : stop.startDate;
  const newEnd = endDate ? new Date(endDate) : stop.endDate;

  if (newEnd < newStart) throw new AppError(400, 'INVALID_DATES', 'endDate must be on or after startDate.');
  if (newStart < trip.startDate || newEnd > trip.endDate)
    throw new AppError(422, 'STOP_DATES_OUTSIDE_TRIP', 'Stop dates must be within trip range.');

  // Check activities don't fall outside narrowed range
  if (startDate || endDate) {
    const offending = await prisma.tripActivity.findMany({
      where: {
        stopId,
        OR: [{ activityDate: { lt: newStart } }, { activityDate: { gt: newEnd } }],
      },
    });
    if (offending.length > 0) {
      throw new AppError(422, 'ACTIVITY_DATE_OUTSIDE_STOP',
        'Stop date change would leave activities outside the new range.',
        offending.map((a) => a.id)
      );
    }
  }

  return prisma.tripStop.update({
    where: { id: stopId },
    data: {
      ...(startDate && { startDate: newStart }),
      ...(endDate && { endDate: newEnd }),
      ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
    },
    include: { city: true },
  });
};

export const deleteStop = async (tripId, stopId, userId) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can delete stops.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  await prisma.tripStop.delete({ where: { id: stopId } });
};

// ─── ACTIVITIES ────────────────────────────────────────────────────────────────

export const getActivities = async (tripId, stopId, userId) => {
  await resolveTripAccess(tripId, userId);
  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  return prisma.tripActivity.findMany({
    where: { stopId },
    orderBy: [{ activityDate: 'asc' }, { sequence: 'asc' }],
    include: { activity: true },
  });
};

export const createActivity = async (tripId, stopId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can add activities.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  const { activityId, customName, description, activityDate, startMinute, durationMin, estimatedCost } = data;

  // Exactly one of activityId / customName required
  if (activityId && customName) throw new AppError(400, 'AMBIGUOUS_ACTIVITY', 'Provide either activityId or customName, not both.');
  if (!activityId && !customName) throw new AppError(400, 'MISSING_ACTIVITY', 'Provide either activityId or customName.');

  // Validate startMinute range
  if (startMinute !== undefined && (startMinute < 0 || startMinute > 1439))
    throw new AppError(400, 'INVALID_START_MINUTE', 'startMinute must be between 0 and 1439.');

  const date = new Date(activityDate);
  if (date < stop.startDate || date > stop.endDate)
    throw new AppError(422, 'ACTIVITY_DATE_OUTSIDE_STOP', 'activityDate must be within the stop\'s date range.');

  let resolvedCost = estimatedCost;

  if (activityId) {
    const master = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!master) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Master activity not found.');
    if (master.cityId !== stop.cityId)
      throw new AppError(422, 'ACTIVITY_NOT_IN_CITY', 'This activity does not belong to the stop\'s city.');
    if (resolvedCost === undefined) resolvedCost = master.defaultCost;
  }

  // Sequence = max + 1 for this (stopId, activityDate)
  const maxSeq = await prisma.tripActivity.aggregate({
    where: { stopId, activityDate: date },
    _max: { sequence: true },
  });
  const sequence = (maxSeq._max.sequence || 0) + 1;

  return prisma.tripActivity.create({
    data: {
      stopId,
      activityId: activityId || null,
      customName: customName || null,
      description,
      activityDate: date,
      startMinute,
      durationMin,
      estimatedCost: resolvedCost !== undefined ? parseFloat(resolvedCost) : null,
      sequence,
    },
    include: { activity: true },
  });
};

export const reorderActivities = async (tripId, stopId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can reorder activities.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  const { activityDate, tripActivityIds } = data;
  const date = new Date(activityDate);

  const existing = await prisma.tripActivity.findMany({
    where: { stopId, activityDate: date },
  });

  if (tripActivityIds.length !== existing.length)
    throw new AppError(400, 'INCOMPLETE_ORDER', 'tripActivityIds must contain every activity on this day exactly once.');

  const existingIds = new Set(existing.map((a) => a.id));
  for (const id of tripActivityIds) {
    if (!existingIds.has(id)) throw new AppError(404, 'ACTIVITY_NOT_FOUND', `Activity ${id} not found on this day.`);
  }

  // Transactional renumber — startMinute is NOT touched
  await prisma.$transaction(
    tripActivityIds.map((id, index) =>
      prisma.tripActivity.update({ where: { id }, data: { sequence: index + 1 } })
    )
  );

  return prisma.tripActivity.findMany({
    where: { stopId, activityDate: date },
    orderBy: { sequence: 'asc' },
    include: { activity: true },
  });
};

export const updateActivity = async (tripId, stopId, tripActivityId, userId, data) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can update activities.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  const activity = await prisma.tripActivity.findUnique({ where: { id: tripActivityId } });
  if (!activity || activity.stopId !== stopId) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found.');

  const { activityDate, startMinute, durationMin, estimatedCost, description, customName } = data;

  if (startMinute !== undefined && (startMinute < 0 || startMinute > 1439))
    throw new AppError(400, 'INVALID_START_MINUTE', 'startMinute must be between 0 and 1439.');

  if (activityDate) {
    const date = new Date(activityDate);
    if (date < stop.startDate || date > stop.endDate)
      throw new AppError(422, 'ACTIVITY_DATE_OUTSIDE_STOP', 'activityDate must be within the stop\'s date range.');
  }

  return prisma.tripActivity.update({
    where: { id: tripActivityId },
    data: {
      ...(activityDate && { activityDate: new Date(activityDate) }),
      ...(startMinute !== undefined && { startMinute }),
      ...(durationMin !== undefined && { durationMin }),
      ...(estimatedCost !== undefined && { estimatedCost: parseFloat(estimatedCost) }),
      ...(description !== undefined && { description }),
      ...(customName !== undefined && { customName }),
    },
    include: { activity: true },
  });
};

export const deleteActivity = async (tripId, stopId, tripActivityId, userId) => {
  const { trip } = await resolveTripAccess(tripId, userId);
  if (trip.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Only the owner can delete activities.');

  const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
  if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');

  const activity = await prisma.tripActivity.findUnique({ where: { id: tripActivityId } });
  if (!activity || activity.stopId !== stopId) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found.');

  await prisma.tripActivity.delete({ where: { id: tripActivityId } });
};

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export const getExpenses = async (tripId, userId, query) => {
  const { trip, isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can view expenses.');

  const { stopId, category } = query;
  const { skip, take, page, limit } = paginate(query);

  const where = { tripId };
  if (stopId === 'null') where.stopId = null;
  else if (stopId) where.stopId = stopId;
  if (category) where.category = category;

  const [data, total] = await prisma.$transaction([
    prisma.expense.findMany({ where, orderBy: { expenseDate: 'asc' }, skip, take }),
    prisma.expense.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const createExpense = async (tripId, userId, data) => {
  const { trip, isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can create expenses.');

  const { category, description, amount, expenseDate, stopId } = data;

  if (!amount || parseFloat(amount) <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'amount must be greater than 0.');

  if (stopId) {
    const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
    if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');
  }

  return prisma.expense.create({
    data: {
      tripId,
      stopId: stopId || null,
      category,
      description,
      amount: parseFloat(amount),
      expenseDate: new Date(expenseDate),
    },
  });
};

export const updateExpense = async (tripId, expenseId, userId, data) => {
  const { isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can update expenses.');

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.tripId !== tripId) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.');

  const { category, description, amount, expenseDate, stopId } = data;

  if (amount !== undefined && parseFloat(amount) <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'amount must be greater than 0.');

  if (stopId) {
    const stop = await prisma.tripStop.findUnique({ where: { id: stopId } });
    if (!stop || stop.tripId !== tripId) throw new AppError(404, 'STOP_NOT_IN_TRIP', 'Stop not found in this trip.');
  }

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(category && { category }),
      ...(description && { description }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(expenseDate && { expenseDate: new Date(expenseDate) }),
      ...(stopId !== undefined && { stopId: stopId || null }),
    },
  });
};

export const deleteExpense = async (tripId, expenseId, userId) => {
  const { isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can delete expenses.');

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.tripId !== tripId) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found.');

  await prisma.expense.delete({ where: { id: expenseId } });
};

// ─── SHARING ──────────────────────────────────────────────────────────────────

export const getShares = async (tripId, userId) => {
  const { trip, isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can view shares.');

  return prisma.tripShare.findMany({
    where: { tripId },
    include: { user: { select: { id: true, username: true, email: true, photoUrl: true } } },
  });
};

export const addShare = async (tripId, userId, data) => {
  const { trip, isOwner } = await resolveTripAccess(tripId, userId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can share this trip.');

  const { email, username, permission } = data;
  if (!email && !username) throw new AppError(400, 'MISSING_IDENTIFIER', 'Provide email or username to share with.');

  const target = await prisma.user.findFirst({
    where: email ? { email } : { username },
  });
  if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'No user found with that email or username.');
  if (target.id === userId) throw new AppError(400, 'CANNOT_SHARE_WITH_SELF', 'You cannot share a trip with yourself.');

  const existing = await prisma.tripShare.findUnique({
    where: { tripId_userId: { tripId, userId: target.id } },
  });
  if (existing) throw new AppError(409, 'ALREADY_SHARED', 'This trip is already shared with that user.');

  let promoted = false;
  if (trip.visibility === 'PRIVATE') {
    await prisma.trip.update({ where: { id: tripId }, data: { visibility: 'SHARED' } });
    promoted = true;
  }

  const share = await prisma.tripShare.create({
    data: { tripId, userId: target.id, permission: permission || 'VIEW' },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  return { share, promoted, message: promoted ? 'Trip visibility promoted to SHARED.' : undefined };
};

export const removeShare = async (tripId, shareUserId, ownerId) => {
  const { isOwner } = await resolveTripAccess(tripId, ownerId);
  if (!isOwner) throw new AppError(403, 'FORBIDDEN', 'Only the owner can remove shares.');

  const existing = await prisma.tripShare.findUnique({
    where: { tripId_userId: { tripId, userId: shareUserId } },
  });
  if (!existing) throw new AppError(404, 'SHARE_NOT_FOUND', 'Share not found.');

  await prisma.tripShare.delete({ where: { tripId_userId: { tripId, userId: shareUserId } } });
};
