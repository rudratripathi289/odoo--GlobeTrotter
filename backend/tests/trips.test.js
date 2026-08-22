import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let accessToken;
let tripId;
let stopId;
let tripActivityId;
let cityId;
let masterActivityId;
const stamp = Date.now();

const testUser = {
  firstName: 'Trip',
  lastName: 'Tester',
  username: `trip_${stamp}`,
  email: `trip_${stamp}@test.globetrotter`,
  password: 'TripPass@123',
};

beforeAll(async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
  accessToken = regRes.body.data.accessToken;

  const country = await prisma.country.create({
    data: { name: `India_${stamp}`, code: `IN_${stamp}` },
  });

  const state = await prisma.state.create({
    data: { countryId: country.id, name: `Himachal_${stamp}` },
  });

  const city = await prisma.city.create({
    data: { countryId: country.id, stateId: state.id, name: `Manali_${stamp}` },
  });
  cityId = city.id;

  const activity = await prisma.activity.create({
    data: {
      cityId,
      name: `Skiing_${stamp}`,
      category: 'ADVENTURE',
      defaultCost: 1500,
      durationMin: 120,
    },
  });
  masterActivityId = activity.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

// ─── Trips ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/trips', () => {
  it('creates a new trip and returns it', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Himachal Adventure',
        startDate: '2027-12-10',
        endDate: '2027-12-20',
        budget: 30000,
        currency: 'INR',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Himachal Adventure');
    expect(res.body.visibility).toBe('PRIVATE');
    tripId = res.body.id;
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/v1/trips').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });

  it('returns 400 if endDate is before startDate', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Bad Dates', startDate: '2027-12-20', endDate: '2027-12-10', currency: 'INR' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/trips', () => {
  it('returns the list of my trips', async () => {
    const res = await request(app)
      .get('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty('total');
  });
});

describe('GET /api/v1/trips/:tripId', () => {
  it('returns trip details for owner', async () => {
    const res = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tripId);
  });
});

// ─── Stops ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/trips/:tripId/stops', () => {
  it('adds a stop to the trip', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${tripId}/stops`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        cityId,
        startDate: '2027-12-12',
        endDate: '2027-12-16',
        budget: 10000,
      });

    expect(res.status).toBe(201);
    expect(res.body.sequence).toBe(1);
    stopId = res.body.id;
  });

  it('returns 422 if stop dates are outside trip range', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${tripId}/stops`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cityId, startDate: '2027-12-01', endDate: '2027-12-05', budget: 5000 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STOP_DATES_OUTSIDE_TRIP');
  });
});

// ─── Activities ────────────────────────────────────────────────────────────────

describe('POST /api/v1/trips/:tripId/stops/:stopId/activities', () => {
  it('adds a master activity to a stop and snapshots estimatedCost', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${tripId}/stops/${stopId}/activities`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        activityId: masterActivityId,
        activityDate: '2027-12-13',
        startMinute: 600,
        durationMin: 120,
      });

    expect(res.status).toBe(201);
    expect(parseFloat(res.body.estimatedCost)).toBe(1500);
    tripActivityId = res.body.id;
  });

  it('returns 400 if both activityId and customName are sent', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${tripId}/stops/${stopId}/activities`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ activityId: masterActivityId, customName: 'Conflict', activityDate: '2027-12-13' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AMBIGUOUS_ACTIVITY');
  });

  it('adds a custom activity', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${tripId}/stops/${stopId}/activities`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customName: 'Visit cousin',
        activityDate: '2027-12-14',
        startMinute: 1080,
        estimatedCost: 0,
      });
    expect(res.status).toBe(201);
    expect(res.body.customName).toBe('Visit cousin');
  });
});

// ─── Budget View ──────────────────────────────────────────────────────────────

describe('GET /api/v1/trips/:tripId/budget', () => {
  it('returns a budget summary', async () => {
    const res = await request(app)
      .get(`/api/v1/trips/${tripId}/budget`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activityCost');
    expect(res.body).toHaveProperty('totalEstimatedCost');
    expect(res.body).toHaveProperty('withinBudget');
    expect(res.body).toHaveProperty('byStop');
    expect(res.body).toHaveProperty('byDay');
  });
});

// ─── Visibility / Community ───────────────────────────────────────────────────

describe('PATCH /api/v1/trips/:tripId → visibility: PUBLIC', () => {
  it('makes the trip public', async () => {
    const res = await request(app)
      .patch(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ visibility: 'PUBLIC' });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe('PUBLIC');
  });
});
