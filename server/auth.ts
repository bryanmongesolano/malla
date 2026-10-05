import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
  const isProd = process.env.NODE_ENV === 'production';
  let username = c.req.header('X-authentik-username') || c.req.header('x-authentik-username');

  if (!username) {
    if (!isProd) {
      username = process.env.DEV_USER || 'bryan';
    } else {
      return c.json({ error: 'No autenticado: falta cabecera de sesión Authentik' }, 401);
    }
  }

  // Check allowed users list if configured
  const allowedList = process.env.ALLOWED_USERS
    ? process.env.ALLOWED_USERS.split(',').map(u => u.trim().toLowerCase())
    : null;

  if (allowedList && !allowedList.includes(username.toLowerCase())) {
    return c.json({ error: `Usuario '${username}' no autorizado para este recurso` }, 403);
  }

  c.set('username', username);
  await next();
}
