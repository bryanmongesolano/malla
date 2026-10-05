import { describe, it, expect, beforeAll } from 'vitest';
import app from '../server/index.js';

describe('Server API Integration Tests', () => {
  it('GET /api/health returns 200 and ok:true', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('GET /api/state with X-authentik-username returns complete state', async () => {
    const res = await app.request('/api/state', {
      headers: {
        'X-authentik-username': 'testuser'
      }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe('testuser');
    expect(body.curriculum.courses.length).toBe(43);
    expect(body.statuses['SOFT-01']).toBe('disponible');
    expect(body.statuses['SOFT-02']).toBe('bloqueada');
  });

  it('PUT /api/progress/:itemId updates progress and unlocks next courses', async () => {
    const res = await app.request('/api/progress/SOFT-01', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ status: 'completada' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.state.statuses['SOFT-01']).toBe('completada');
    expect(body.state.statuses['SOFT-02']).toBe('disponible');
  });

  it('PUT /api/progress/:itemId prevents unmarking when dependent is active (Rule 7)', async () => {
    // 1. Advance SOFT-02 to cursando
    const advRes = await app.request('/api/progress/SOFT-02', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ status: 'cursando' })
    });
    expect(advRes.status).toBe(200);

    // 2. Attempt to demote SOFT-01 to disponible
    const demoteRes = await app.request('/api/progress/SOFT-01', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ status: 'disponible' })
    });
    expect(demoteRes.status).toBe(409);
    const body = await demoteRes.json();
    expect(body.error).toContain('dependen de ella');
    expect(body.blockingDependents).toBeDefined();

    // 3. Demote SOFT-02 to disponible first
    const cleanRes = await app.request('/api/progress/SOFT-02', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ status: 'disponible' })
    });
    expect(cleanRes.status).toBe(200);

    // 4. Now demote SOFT-01 to disponible should succeed!
    const demoteSuccessRes = await app.request('/api/progress/SOFT-01', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ status: 'disponible' })
    });
    expect(demoteSuccessRes.status).toBe(200);
  });

  it('PUT /api/settings updates simulation settings', async () => {
    const res = await app.request('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-authentik-username': 'testuser'
      },
      body: JSON.stringify({ coursesPerPeriod: 5 })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state.settings.coursesPerPeriod).toBe(5);
  });
});
