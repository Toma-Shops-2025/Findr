import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  bearerToken,
  signAdminToken,
  verifyAdminToken,
} from '../modules/auth/jwt.js';
import { getReportStore } from '../modules/safety/reportStore.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function adminFromRequest(
  req: { headers: { authorization?: string } },
): Promise<{ email: string } | null> {
  const token = bearerToken(req.headers.authorization);
  if (!token) return null;
  return verifyAdminToken(token);
}

function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_EMAIL?.trim() && process.env.ADMIN_PASSWORD_BCRYPT?.trim(),
  );
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_BCRYPT?.trim();
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Findr Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #12151C; color: #E8E4DC; margin: 0; padding: 24px; }
    h1 { color: #FF6B4A; }
    input, button { font-size: 16px; padding: 10px; margin: 6px 0; width: 100%; max-width: 360px; box-sizing: border-box; }
    button { background: #FF6B4A; color: #12151C; border: none; cursor: pointer; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    th, td { border: 1px solid #2C3344; padding: 8px; text-align: left; }
    .hidden { display: none; }
    .err { color: #E5484D; }
  </style>
</head>
<body>
  <h1>Findr Admin</h1>
  <div id="login">
    <p>Open safety reports queue. Sign in with founder credentials (set on API server).</p>
    <input id="email" type="email" placeholder="Email" autocomplete="username" />
    <input id="password" type="password" placeholder="Password" autocomplete="current-password" />
    <button id="loginBtn">Sign in</button>
    <p id="loginErr" class="err"></p>
  </div>
  <div id="dash" class="hidden">
    <button id="refreshBtn">Refresh reports</button>
    <button id="logoutBtn">Sign out</button>
    <table>
      <thead><tr><th>When</th><th>Reason</th><th>Target</th><th>Reporter</th><th>ID</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <script>
    const api = window.location.origin;
    const tokenKey = 'findr_admin_token';
    function showDash() {
      document.getElementById('login').classList.add('hidden');
      document.getElementById('dash').classList.remove('hidden');
      loadReports();
    }
    async function loadReports() {
      const t = localStorage.getItem(tokenKey);
      const res = await fetch(api + '/admin/api/reports', { headers: { Authorization: 'Bearer ' + t } });
      if (!res.ok) { localStorage.removeItem(tokenKey); location.reload(); return; }
      const data = await res.json();
      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      for (const r of data.reports || []) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + r.createdAt + '</td><td>' + r.reason + '</td><td>' + r.targetUserId + '</td><td>' + r.reporterId + '</td><td>' + r.id + '</td>';
        tbody.appendChild(tr);
      }
    }
    document.getElementById('loginBtn').onclick = async () => {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const res = await fetch(api + '/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        document.getElementById('loginErr').textContent = 'Invalid credentials or admin not configured.';
        return;
      }
      const data = await res.json();
      localStorage.setItem(tokenKey, data.accessToken);
      showDash();
    };
    document.getElementById('refreshBtn').onclick = loadReports;
    document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem(tokenKey); location.reload(); };
    if (localStorage.getItem(tokenKey)) showDash();
  </script>
</body>
</html>`;

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_req, reply) => {
    return reply.type('text/html').send(ADMIN_HTML);
  });

  app.post('/api/login', async (req, reply) => {
    if (!adminConfigured()) {
      return reply.code(503).send({ error: 'admin_not_configured' });
    }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    const expectedEmail = process.env.ADMIN_EMAIL!.trim().toLowerCase();
    if (parsed.data.email.trim().toLowerCase() !== expectedEmail) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    if (!(await verifyAdminPassword(parsed.data.password))) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    const accessToken = await signAdminToken(parsed.data.email);
    return { accessToken };
  });

  app.get('/api/reports', async (req, reply) => {
    const admin = await adminFromRequest(req);
    if (!admin) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const store = await getReportStore();
    const reports = await store.listOpen(100);
    return { reports };
  });
};
