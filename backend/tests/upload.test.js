import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

let accessToken;
const stamp = Date.now();

const testUser = {
  firstName: 'Upload',
  lastName: 'Tester',
  username: `upload_${stamp}`,
  email: `upload_${stamp}@test.globetrotter`,
  password: 'UploadPass@123',
};

beforeAll(async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
  accessToken = regRes.body.data.accessToken;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.globetrotter' } } });
  await prisma.$disconnect();
});

describe('Image Upload Endpoints (/api/v1/upload)', () => {
  it('POST /api/v1/upload/image → uploads single image file buffer', async () => {
    // 1x1 transparent PNG buffer
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/upload/image')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', buffer, 'test.png');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/uploaded/i);
    expect(res.body.data).toHaveProperty('url');
    expect(res.body.data).toHaveProperty('publicId');
  });

  it('POST /api/v1/upload/image → returns 401 without auth token', async () => {
    const buffer = Buffer.from('fake image content');
    const res = await request(app)
      .post('/api/v1/upload/image')
      .attach('image', buffer, 'test.jpg');

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/upload/image → returns 400 when non-image file attached', async () => {
    const buffer = Buffer.from('hello world plain text');
    const res = await request(app)
      .post('/api/v1/upload/image')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', buffer, 'document.txt');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('POST /api/v1/upload/image → returns 400 when no file field provided', async () => {
    const res = await request(app)
      .post('/api/v1/upload/image')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });

  it('POST /api/v1/upload/images → uploads multiple image files', async () => {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/upload/images')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('images', buffer, 'img1.png')
      .attach('images', buffer, 'img2.png');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(2);
  });
});
