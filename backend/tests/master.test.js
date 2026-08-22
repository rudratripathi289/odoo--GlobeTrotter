import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let accessToken;
let countryId;
let stateId;
let cityId;
const stamp = Date.now();

beforeAll(async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Master',
    lastName: 'Tester',
    username: `master_${stamp}`,
    email: `master_${stamp}@test.globetrotter`,
    password: 'MasterPass@123',
  });
  accessToken = regRes.body.data.accessToken;

  const country = await prisma.country.create({
    data: { name: `France_${stamp}`, code: `FR_${stamp}` },
  });
  countryId = country.id;

  const state = await prisma.state.create({
    data: { countryId: country.id, name: `IDF_${stamp}` },
  });
  stateId = state.id;

  const city = await prisma.city.create({
    data: { countryId: country.id, stateId: state.id, name: `Paris_${stamp}`, popularity: 100 },
  });
  cityId = city.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

describe('Master Data Endpoints (/api/v1/countries, /states, /cities)', () => {
  it('GET /countries → 200 returns list of countries', async () => {
    const res = await request(app)
      .get('/api/v1/countries')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /states?countryId=... → returns states for country', async () => {
    const res = await request(app)
      .get(`/api/v1/states?countryId=${countryId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /cities without search or countryId → 400 FILTER_REQUIRED', async () => {
    const res = await request(app)
      .get('/api/v1/cities')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILTER_REQUIRED');
  });

  it('GET /cities?search=Paris → returns matching cities', async () => {
    const res = await request(app)
      .get(`/api/v1/cities?search=Paris_${stamp}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /cities/:cityId → returns city by id', async () => {
    const res = await request(app)
      .get(`/api/v1/cities/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(`Paris_${stamp}`);
  });
});
