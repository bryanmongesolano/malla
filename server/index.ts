import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import {
  CurriculumModel,
  computeAllStatuses,
  computeOverallProgress,
  simulateGraduation,
  canTransition
} from '../shared/index.js';
import type { Curriculum } from '../shared/types.js';
import {
  getUserProgress,
  setUserProgressItem,
  getUserSettings,
  setUserSettings
} from './db.js';
import { authMiddleware } from './auth.js';

// Load curriculum data
const curriculumPath = path.join(process.cwd(), 'data', 'curriculum.json');
const curriculumRaw = JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));
const model = new CurriculumModel(curriculumRaw as Curriculum);

const validation = model.validate();
if (!validation.valid) {
  console.error('Curriculum validation errors:', validation.errors);
  process.exit(1);
}

const app = new Hono<{ Variables: { username: string } }>();

// 1. Health check (unauthenticated for Docker/CI/Cloudflare)
app.get('/api/health', c => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// Helper to build full client state
function buildFullState(username: string) {
  const progress = getUserProgress(username);
  const settings = getUserSettings(username);
  const statuses = computeAllStatuses(model, progress);
  const overall = computeOverallProgress(model, progress);
  const simulation = simulateGraduation(model, progress, settings.coursesPerPeriod);

  return {
    username,
    progress,
    settings,
    statuses,
    overall,
    simulation,
    curriculum: model.getCurriculum()
  };
}

// 2. Protected API routes
const api = new Hono<{ Variables: { username: string } }>();
api.use('*', authMiddleware);

api.get('/state', c => {
  const username = c.get('username');
  return c.json(buildFullState(username));
});

api.put('/progress/:itemId', async c => {
  const username = c.get('username');
  const itemId = c.req.param('itemId');
  const body = await c.req.json<{ status: 'disponible' | 'cursando' | 'completada' | 'suficiencia' }>();

  if (!body || !['disponible', 'cursando', 'completada', 'suficiencia'].includes(body.status)) {
    return c.json({ error: 'Estado inválido. Opciones: disponible, cursando, completada, suficiencia' }, 400);
  }

  const currentProgress = getUserProgress(username);
  const check = canTransition(itemId, body.status, model, currentProgress);

  if (!check.allowed) {
    return c.json({
      error: check.reason,
      blockingDependents: check.blockingDependents,
      missingPrereqs: check.missingPrereqs
    }, 409);
  }

  setUserProgressItem(username, itemId, body.status);
  return c.json({
    ok: true,
    state: buildFullState(username)
  });
});

api.put('/settings', async c => {
  const username = c.get('username');
  const body = await c.req.json<{ coursesPerPeriod: number }>();

  if (!body || typeof body.coursesPerPeriod !== 'number' || body.coursesPerPeriod < 1 || body.coursesPerPeriod > 10) {
    return c.json({ error: 'coursesPerPeriod debe ser un número entre 1 y 10' }, 400);
  }

  setUserSettings(username, { coursesPerPeriod: Math.round(body.coursesPerPeriod) });
  return c.json({
    ok: true,
    state: buildFullState(username)
  });
});

app.route('/api', api);

// 3. Static files in production / when dist exists
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  app.use('/*', serveStatic({ root: './dist' }));
  // Fallback to index.html for SPA client-side routing
  app.get('*', c => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf-8'));
    }
    return c.text('Not found', 404);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const PORT = parseInt(process.env.PORT || '3009', 10);
  console.log(`Starting server on http://localhost:${PORT}`);

  serve({
    fetch: app.fetch,
    port: PORT
  });
}

export default app;
