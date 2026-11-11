import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const E = process.env;
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(here, 'public')));

const mailer = E.SMTP_USER && E.SMTP_PASS
  ? nodemailer.createTransport({ host: E.SMTP_HOST || 'smtp.gmail.com', port: +(E.SMTP_PORT || 465), secure: (E.SMTP_PORT || '465') === '465', auth: { user: E.SMTP_USER, pass: E.SMTP_PASS } })
  : null;

// Contact form: validate, drop bots, store on disk, email if SMTP is configured
const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many messages. Try again in a few minutes.' } });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

app.post('/api/contact', contactLimit, async (req, res) => {
  const { name, email, message, _honey } = req.body || {};
  if (_honey) return res.json({ ok: true });
  const m = { name: clean(name, 80), email: clean(email, 120), message: clean(message, 2000), at: new Date().toISOString() };
  if (!m.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email) || m.message.length < 5)
    return res.status(400).json({ ok: false, error: 'Please fill in your name, a valid email and a message.' });
  try {
    await mkdir(path.join(here, 'data'), { recursive: true });
    await appendFile(path.join(here, 'data', 'messages.jsonl'), JSON.stringify(m) + '\n');
    if (mailer) await mailer.sendMail({ from: E.SMTP_USER, to: E.MAIL_TO || E.SMTP_USER, replyTo: m.email, subject: `Portfolio message from ${m.name}`, text: `${m.message}\n\n${m.name} <${m.email}>` });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error. Please email me directly.' });
  }
});

// GitHub stats proxy with 10 minute cache (keeps tokens off the browser)
let cache = { at: 0, data: [] };
app.get('/api/github', async (_req, res) => {
  if (Date.now() - cache.at < 600000) return res.json(cache.data);
  try {
    const r = await fetch('https://api.github.com/users/sonu-singh-invertian/repos?per_page=100&sort=updated', { headers: { 'User-Agent': 'portfolio', ...(E.GITHUB_TOKEN && { Authorization: `Bearer ${E.GITHUB_TOKEN}` }) } });
    if (!r.ok) throw new Error(r.status);
    cache = { at: Date.now(), data: (await r.json()).map(x => ({ name: x.name, stars: x.stargazers_count, lang: x.language, pushed: x.pushed_at })) };
    res.json(cache.data);
  } catch { res.json(cache.data); }
});

app.get('/api/health', (_q, r) => r.json({ ok: true }));
app.listen(E.PORT || 3000, () => console.log(`Portfolio running on http://localhost:${E.PORT || 3000}`));
