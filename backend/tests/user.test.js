import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let accessToken;
let cityId;
const stamp = Date.now();

const user = {
  firstName: 'UserModule',
  lastName: 'Tester',
  username: `user_${stamp}`,
  email: `user_${stamp}@test.globetrotter`,
  password: 'UserPass@123',
};

beforeAll(async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send(user);
  accessToken = regRes.body.data.accessToken;

  const country = await prisma.country.create({
    data: { name: `USA_${stamp}`, code: `US_${stamp}` },
  });
  const state = await prisma.state.create({
    data: { countryId: country.id, name: `NY_${stamp}` },
  });
  const city = await prisma.city.create({
    data: { countryId: country.id, stateId: state.id, name: `NYC_${stamp}` },
  });
  cityId = city.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.city.deleteMany({ where: { name: { contains: '_TEST' } } });
  await prisma.$disconnect();
});

describe('User Profile Endpoints (/api/v1/users)', () => {
  it('GET /users/me → returns current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('PATCH /users/me → updates whitelisted profile fields', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bio: 'Travel enthusiast', role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Travel enthusiast');
    expect(res.body.role).toBe('USER');
  });

  it('POST /users/me/saved-destinations → adds a saved city', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/saved-destinations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ cityId });
    expect(res.status).toBe(201);
    expect(res.body.cityId).toBe(cityId);
  });

  it('GET /users/me/saved-destinations → lists saved destinations', async () => {
    const res = await request(app)
      .get('/api/v1/users/me/saved-destinations')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('DELETE /users/me/saved-destinations/:cityId → removes saved city', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/me/saved-destinations/${cityId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});
