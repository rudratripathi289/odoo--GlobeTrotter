import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

// Whitelisted fields for profile update (never spread req.body directly)
const ALLOWED_UPDATE_FIELDS = ['firstName', 'lastName', 'phone', 'photoUrl', 'city', 'country', 'bio', 'language'];

const safeUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  return safeUser(user);
};

export const updateMe = async (userId, data) => {
  // Whitelist fields — do NOT spread body directly
  const updateData = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  return safeUser(updated);
};

export const updatePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

export const deleteMe = async (userId, currentPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Password is incorrect.');

  // Cascade deletes trips, shares, saved destinations, reset tokens via Prisma schema
  await prisma.user.delete({ where: { id: userId } });
};

export const getSavedDestinations = async (userId, query) => {
  const { skip, take, page, limit } = paginate(query);

  const [data, total] = await prisma.$transaction([
    prisma.savedDestination.findMany({
      where: { userId },
      include: { city: { include: { country: true, state: true } } },
      skip,
      take,
    }),
    prisma.savedDestination.count({ where: { userId } }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const addSavedDestination = async (userId, cityId) => {
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw new AppError(404, 'CITY_NOT_FOUND', 'City not found.');

  const existing = await prisma.savedDestination.findUnique({
    where: { userId_cityId: { userId, cityId } },
    include: { city: true },
  });
  if (existing) return existing;

  return prisma.savedDestination.create({
    data: { userId, cityId },
    include: { city: true },
  });
};

export const deleteSavedDestination = async (userId, cityId) => {
  const existing = await prisma.savedDestination.findUnique({
    where: { userId_cityId: { userId, cityId } },
  });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Saved destination not found.');

  await prisma.savedDestination.delete({ where: { id: existing.id } });
};
