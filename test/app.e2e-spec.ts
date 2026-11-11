import { Body, Controller, Module, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, IsString, Min } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

class EchoDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  count: number;
}

@Controller('__test')
class TestOnlyController {
  @Post('echo')
  echo(@Body() dto: EchoDto) {
    return { name: dto.name, count: dto.count, countType: typeof dto.count };
  }
}

@Module({ controllers: [TestOnlyController] })
class TestOnlyModule {}

describe('API foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, TestOnlyModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the API and database as up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('returns a request id, and reuses one sent by the client', async () => {
    const generated = await request(app.getHttpServer()).get('/health');
    expect(generated.headers['x-request-id']).toMatch(/^[\w-]+$/);

    const reused = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'my-trace-123');
    expect(reused.headers['x-request-id']).toBe('my-trace-123');
  });

  it('sets security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('unknown route → 404 NOT_FOUND in the standard error shape', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: expect.any(String),
    });
  });

  it('valid body passes validation and is transformed', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test/echo')
      .send({ name: 'reluctant', count: 2 })
      .expect(201);
    expect(res.body).toEqual({ name: 'reluctant', count: 2, countType: 'number' });
  });

  it('unknown field → 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test/echo')
      .send({ name: 'reluctant', count: 2, role: 'ADMIN' })
      .expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: { role: [expect.stringContaining('should not exist')] },
    });
  });

  it('invalid fields → 400 with a message per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test/echo')
      .send({ count: 0 })
      .expect(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['count', 'name']);
  });

  it('malformed JSON → 400 BAD_REQUEST', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test/echo')
      .set('content-type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('serves the Swagger docs outside production', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.paths).toHaveProperty('/health');
  });
});
