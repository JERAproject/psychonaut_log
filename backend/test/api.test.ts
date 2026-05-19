import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = 3002;
let server: any;

beforeAll(async () => {
  server = app.listen(PORT);

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expiresAt);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  app.get('/api/habits', (req, res) => {
    const habits = db.prepare(
      "SELECT id, name, color, max_per_day as maxPerDay FROM habits WHERE user_id IS NULL"
    ).all();
    res.json(habits);
  });

  app.post('/api/habits', (req, res) => {
    const { name, color, maxPerDay } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: "name and color are required" });
    }
    const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
    db.prepare(
      "INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, NULL)"
    ).run(name, color, max);
    res.status(201).json({ ok: true });
  });
});

afterAll(() => {
  server?.close();
});

describe('Auth API', () => {
  it('should reject login without credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('should reject login with invalid username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent', password: 'test' });
    expect(res.status).toBe(401);
  });
});

describe('Habits API', () => {
  it('should get global habits', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should reject habit without name', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ color: '#ff0000' });
    expect(res.status).toBe(400);
  });

  it('should reject habit without color', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Test Habit' });
    expect(res.status).toBe(400);
  });

  it('should create habit with valid data', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Test Habit', color: '#ff0000', maxPerDay: 5 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});