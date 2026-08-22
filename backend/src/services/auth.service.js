import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const safeUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const registerUser = async ({ firstName, lastName, username, email, password }) => {
  // Check for duplicate email or username
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new AppError(409, 'DUPLICATE', `A user with this ${field} already exists.`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { firstName, lastName, username, email, passwordHash },
  });

  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    user: safeUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Use constant-time compare to prevent timing attacks
  const passwordValid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    user: safeUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

export const refreshToken = async (token) => {
  if (!token) throw new AppError(401, 'MISSING_TOKEN', 'Refresh token is required.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token.');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new AppError(401, 'USER_NOT_FOUND', 'User no longer exists.');

  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

export const logoutUser = async (_userId) => {
  // Stateless JWT: logout is handled client-side by discarding tokens.
  // If refresh token blocklist is implemented (Redis), invalidate here.
  return true;
};

export const forgotPassword = async (email) => {
  // Always return success — never reveal whether the email exists (spec §4)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  // TODO: Send email via Resend with rawToken as query param
  // e.g. `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`
  console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
};

export const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired reset token.');
  if (record.usedAt) throw new AppError(400, 'TOKEN_USED', 'This reset token has already been used.');
  if (record.expiresAt < new Date()) throw new AppError(400, 'TOKEN_EXPIRED', 'This reset token has expired.');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Transactional: update password + mark token used atomically
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
};
