import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import { mkdirSync } from 'node:fs';
import { routes } from './routes/index.js';
import { requireAuth } from './lib/auth.js';

dotenv.config();

const app = Fastify({ logger: true });

await app.register(sensible);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
  credentials: true
});
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-me',
  sign: { expiresIn: '8h' }
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

app.decorate('authenticate', requireAuth);

mkdirSync(process.env.UPLOAD_DIR || './uploads', { recursive: true });

await app.register(routes, { prefix: '/api' });

const port = Number(process.env.API_PORT || 3000);
await app.listen({ port, host: '0.0.0.0' });
