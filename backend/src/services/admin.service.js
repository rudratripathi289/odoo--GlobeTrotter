import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

const paginate = (query) => {
  const page = Math.max(1, parseInt(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const getAllUsers = async (query) => {
  const { search } = query;
  const { skip, take, page, limit } = paginate(query);

  const where = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  return user;
};

export const updateUserRole = async (targetUserId, role, requestingAdminId) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');

  // Admin cannot demote themselves
  if (targetUserId === requestingAdminId && role === 'USER') {
    throw new AppError(409, 'CANNOT_DEMOTE_SELF', 'You cannot demote your own admin account.');
  }

  // Prevent demoting the last admin
  if (role === 'USER' && user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) throw new AppError(409, 'LAST_ADMIN', 'Cannot demote the last remaining admin.');
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: { id: true, username: true, email: true, role: true },
  });
};

export const deleteUser = async (targetUserId, requestingAdminId) => {
  if (targetUserId === requestingAdminId) {
    throw new AppError(409, 'CANNOT_DELETE_SELF', 'Admin cannot delete their own account.');
  }
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');

  await prisma.user.delete({ where: { id: targetUserId } });
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export const getAnalyticsOverview = async () => {
  const [totalUsers, totalTrips, totalStops, totalActivities] = await prisma.$transaction([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.tripStop.count(),
    prisma.tripActivity.count(),
  ]);

  const publicTrips = await prisma.trip.count({ where: { visibility: 'PUBLIC' } });
  const copiedTrips = await prisma.trip.count({ where: { copiedFromTripId: { not: null } } });

  return { totalUsers, totalTrips, publicTrips, copiedTrips, totalStops, totalActivities };
};

export const getPopularCities = async () => {
  const cities = await prisma.city.findMany({
    orderBy: { popularity: 'desc' },
    take: 10,
    include: { country: true, state: true },
  });
  return cities;
};

export const getPopularActivities = async () => {
  const activities = await prisma.activity.findMany({
    take: 10,
    orderBy: { tripActivities: { _count: 'desc' } },
    include: { city: true },
  });
  return activities;
};

export const getCopiedTrips = async () => {
  const trips = await prisma.trip.findMany({
    where: { copies: { some: {} } },
    orderBy: { copies: { _count: 'desc' } },
    take: 10,
    include: {
      user: { select: { id: true, username: true } },
      _count: { select: { copies: true } },
    },
  });
  return trips;
};

// ─── MASTER DATA ──────────────────────────────────────────────────────────────

export const createCountry = async (data) => prisma.country.create({ data });

export const updateCountry = async (id, data) => {
  const existing = await prisma.country.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Country not found.');
  return prisma.country.update({ where: { id }, data });
};

export const deleteCountry = async (id) => {
  const existing = await prisma.country.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Country not found.');
  await prisma.country.delete({ where: { id } });
};

export const createState = async (data) => prisma.state.create({ data });

export const updateState = async (id, data) => {
  const existing = await prisma.state.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'State not found.');
  return prisma.state.update({ where: { id }, data });
};

export const deleteState = async (id) => {
  const existing = await prisma.state.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'State not found.');
  await prisma.state.delete({ where: { id } });
};

export const createCity = async (data) => prisma.city.create({ data });

export const updateCity = async (id, data) => {
  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'City not found.');
  return prisma.city.update({ where: { id }, data });
};

export const deleteCity = async (id) => {
  const existing = await prisma.city.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'City not found.');
  await prisma.city.delete({ where: { id } });
};

export const createActivity = async (data) => prisma.activity.create({ data });

export const updateActivity = async (id, data) => {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  return prisma.activity.update({ where: { id }, data });
};

export const deleteActivity = async (id) => {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  await prisma.activity.delete({ where: { id } });
};
