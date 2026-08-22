import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let adminToken;
let userToken;
let regularUserId;
const stamp = Date.now();

const adminUser = {
  firstName: 'Admin',
  lastName: 'Tester',
  username: `admin_${stamp}`,
  email: `admin_${stamp}@test.globetrotter`,
  password: 'AdminPass@123',
};

const regularUser = {
  firstName: 'Regular',
  lastName: 'User',
  username: `regular_${stamp}`,
  email: `regular_${stamp}@test.globetrotter`,
  password: 'UserPass@123',
};

beforeAll(async () => {
  // Create admin user
  const adminRes = await request(app).post('/api/v1/auth/register').send(adminUser);
  adminToken = adminRes.body.data.accessToken;

  // Elevate user to ADMIN role in database
  await prisma.user.update({
    where: { email: adminUser.email },
    data: { role: 'ADMIN' },
  });

  // Re-login to get updated JWT with role === ADMIN
  const relogin = await request(app).post('/api/v1/auth/login').send({
    email: adminUser.email,
    password: adminUser.password,
  });
  adminToken = relogin.body.data.accessToken;

  // Create regular user
  const userRes = await request(app).post('/api/v1/auth/register').send(regularUser);
  userToken = userRes.body.data.accessToken;
  regularUserId = userRes.body.data.user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

describe('Admin Guard & Endpoints (/api/v1/admin/*)', () => {
  it('returns 403 when non-admin accesses admin routes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /admin/users → 200 returns list of users for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /admin/analytics/overview → 200 returns system stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalTrips');
  });

  it('PATCH /admin/users/:userId/role → promotes user role', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${regularUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });
});
