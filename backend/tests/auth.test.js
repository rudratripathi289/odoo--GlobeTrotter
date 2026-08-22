import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

// Clean up test users before each run
beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  const user = {
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser_gt',
    email: 'testuser@test.globetrotter',
    password: 'TestPass@123',
  };

  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(user);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'testuser@test.globetrotter',
      password: 'TestPass@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'testuser@test.globetrotter',
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('always returns 200 regardless of email existence', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'nonexistent@test.globetrotter',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If that email exists/i);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new tokens with a valid refresh token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'testuser@test.globetrotter',
      password: 'TestPass@123',
    });
    const { refreshToken } = loginRes.body.data;

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('returns 401 with an invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });
});
