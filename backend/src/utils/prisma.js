import { PrismaClient } from '@prisma/client';

// Singleton pattern — one Prisma instance for the entire app
const prisma = new PrismaClient();

export default prisma;
