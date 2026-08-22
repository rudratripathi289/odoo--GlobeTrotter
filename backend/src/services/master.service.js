import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const getCountries = async (query) => {
  const { skip, take, page, limit } = paginate(query);

  const [data, total] = await prisma.$transaction([
    prisma.country.findMany({ orderBy: { name: 'asc' }, skip, take }),
    prisma.country.count(),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getStates = async (query) => {
  const { countryId, search } = query;
  const { skip, take, page, limit } = paginate(query);

  const where = {};
  if (countryId) where.countryId = countryId;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [data, total] = await prisma.$transaction([
    prisma.state.findMany({ where, include: { country: true }, orderBy: { name: 'asc' }, skip, take }),
    prisma.state.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getCities = async (query) => {
  const { search, countryId, stateId, sort } = query;

  // At least one filter required (spec §6)
  if (!search && !countryId && !stateId) {
    throw new AppError(400, 'FILTER_REQUIRED', 'Provide at least one of: search, countryId, stateId.');
  }

  const { skip, take, page, limit } = paginate(query);

  const where = {};
  if (countryId) where.countryId = countryId;
  if (stateId) where.stateId = stateId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { state: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy = sort === 'name' ? { name: 'asc' } : { popularity: 'desc' };

  const [data, total] = await prisma.$transaction([
    prisma.city.findMany({
      where,
      include: { country: true, state: true },
      orderBy,
      skip,
      take,
    }),
    prisma.city.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getCityById = async (cityId) => {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { country: true, state: true },
  });
  if (!city) throw new AppError(404, 'CITY_NOT_FOUND', 'City not found.');
  return city;
};

export const getCityActivities = async (cityId, query) => {
  const { search, category, minCost, maxCost, maxDuration } = query;
  const { skip, take, page, limit } = paginate(query);

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw new AppError(404, 'CITY_NOT_FOUND', 'City not found.');

  const where = { cityId };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;
  if (minCost || maxCost) {
    where.defaultCost = {};
    if (minCost) where.defaultCost.gte = parseFloat(minCost);
    if (maxCost) where.defaultCost.lte = parseFloat(maxCost);
  }
  if (maxDuration) where.durationMin = { lte: parseInt(maxDuration) };

  const [data, total] = await prisma.$transaction([
    prisma.activity.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
    prisma.activity.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
