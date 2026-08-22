import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let accessToken;
let publicTripId;
const stamp = Date.now();

beforeAll(async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Comm',
    lastName: 'Tester',
    username: `comm_${stamp}`,
    email: `comm_${stamp}@test.globetrotter`,
    password: 'CommPass@123',
  });

  accessToken = regRes.body.data.accessToken;

  // Create a public trip to copy
  const tripRes = await request(app)
    .post('/api/v1/trips')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Public Goa Trip',
      startDate: '2027-01-01',
      endDate: '2027-01-05',
      budget: 15000,
    });
  publicTripId = tripRes.body.id;

  // Make it public
  await request(app)
    .patch(`/api/v1/trips/${publicTripId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ visibility: 'PUBLIC' });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

describe('Community Routes & Copying (/api/v1/community)', () => {
  it('GET /community/trips → returns public trips without auth', async () => {
    const res = await request(app).get('/api/v1/community/trips');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /community/trips/:tripId → returns public trip details', async () => {
    const res = await request(app).get(`/api/v1/community/trips/${publicTripId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(publicTripId);
    expect(res.body.user).not.toHaveProperty('email');
  });

  it('POST /community/trips/:tripId/copy → clones trip into caller account as PRIVATE', async () => {
    const res = await request(app)
      .post(`/api/v1/community/trips/${publicTripId}/copy`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', `key_${stamp}`)
      .send({ name: 'Cloned Goa Trip', startDate: '2028-02-01' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tripId');
    expect(res.body.message).toMatch(/copied/i);
  });
});
