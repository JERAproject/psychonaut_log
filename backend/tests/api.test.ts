import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { createTestDb, createTestUser, createTestSession, cleanupTestDb } from './setup.js';

let app: express.Application;
let db: Database.Database;

describe('API Tests', () => {
  beforeEach(async () => {
    db = createTestDb();
    app = await createTestApp(db);
  });

  afterEach(() => {
    cleanupTestDb(db);
    vi.restoreAllMocks();
  });

  async function createTestApp(testDb: Database.Database): Promise<express.Application> {
    const expressApp = express();
    expressApp.use(express.json());

    expressApp.use((req: any, res, next) => {
      req.user = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const session = testDb.prepare(
          "SELECT s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
        ).get(token) as { user_id: number; username: string; role: string } | undefined;
        req.user = session ? { id: session.user_id, username: session.username, role: session.role } : null;
      }
      next();
    });

    expressApp.post('/api/auth/login', async (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
      }
      const user = testDb.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      if (!user) {
        return res.status(401).json({ error: 'invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'invalid credentials' });
      }
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      testDb.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });

    expressApp.get('/api/auth/me', (req, res) => {
      if (!req.user) return res.status(401).json({ error: 'unauthorized' });
      res.json({ user: req.user });
    });

    expressApp.post('/api/auth/logout', (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        testDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      }
      res.json({ ok: true });
    });

    expressApp.get('/api/habits', (req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const userId = req.user?.id ?? null;
      const habits = testDb.prepare(
        'SELECT id, name, color, max_per_day as maxPerDay FROM habits WHERE user_id = ? OR user_id IS NULL'
      ).all(userId);
      res.json(habits);
    });

    expressApp.post('/api/habits', (req, res) => {
      const { name, color, maxPerDay } = req.body;
      if (!name || !color) {
        return res.status(400).json({ error: 'name and color are required' });
      }
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const max = Math.max(1, Math.min(Number(maxPerDay) || 1, 99));
      testDb.prepare(
        'INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)'
      ).run(name, color, max, req.user.id);
      res.status(201).json({ ok: true });
    });

    expressApp.delete('/api/habits/:id', (req, res) => {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      const habit = testDb.prepare('SELECT user_id FROM habits WHERE id = ?').get(id) as any;
      if (!habit) return res.status(404).json({ error: 'Not found' });
      if (habit.user_id === null || req.user?.role === 'admin' || habit.user_id === req.user?.id) {
        testDb.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(id);
        testDb.prepare('DELETE FROM habits WHERE id = ?').run(id);
        return res.json({ ok: true });
      }
      res.status(403).json({ error: 'Forbidden' });
    });

    expressApp.get('/api/logs', (req, res) => {
      const { habitId, startDate, endDate } = req.query;
      const userId = req.user?.id ?? null;

      let query = 'SELECT habit_id as habitId, log_date as logDate, count, user_id FROM habit_logs WHERE 1=1';
      const params: any[] = [];

      if (!req.user?.role) {
        query += ' AND (user_id = ? OR user_id IS NULL)';
        params.push(userId);
      }

      if (habitId) {
        query += ' AND habit_id = ?';
        params.push(habitId);
      }
      if (startDate) {
        query += ' AND log_date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND log_date <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY log_date ASC';

      const logs = testDb.prepare(query).all(...params);
      res.json(logs);
    });

    expressApp.post('/api/log', (req, res) => {
      const { habitId, date } = req.body;
      if (!habitId || !date) {
        return res.status(400).json({ error: 'habitId and date are required' });
      }
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const habit = testDb.prepare(
        'SELECT id, max_per_day as maxPerDay, user_id FROM habits WHERE id = ?'
      ).get(habitId) as { id: number; maxPerDay: number; user_id: number | null } | undefined;

      if (!habit) {
        return res.status(404).json({ error: 'Habit not found' });
      }

      const userId = req.user.id ?? null;

      const existing = testDb.prepare(
        'SELECT count FROM habit_logs WHERE habit_id = ? AND log_date = ? AND user_id = ?'
      ).get(habitId, date, userId) as { count: number } | undefined;

      if (existing) {
        const newCount = Math.min(existing.count + 1, habit.maxPerDay);
        testDb.prepare('UPDATE habit_logs SET count = ? WHERE habit_id = ? AND log_date = ? AND user_id = ?')
          .run(newCount, habitId, date, userId);
      } else {
        testDb.prepare('INSERT INTO habit_logs (habit_id, log_date, count, user_id) VALUES (?, ?, 1, ?)')
          .run(habitId, date, userId);
      }

      res.json({ ok: true });
    });

    expressApp.get('/api/journal', (req, res) => {
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const userId = req.user?.id ?? null;
      const entries = testDb.prepare(
        'SELECT * FROM journal_entries WHERE user_id = ? OR user_id IS NULL ORDER BY fecha DESC, hora DESC'
      ).all(userId);
      res.json(entries);
    });

    expressApp.post('/api/journal', (req, res) => {
      const {
        fecha,
        tipo_practica,
        estado_previo,
        fenomenologia_somatica,
        estado_post,
      } = req.body;

      if (!fecha || !tipo_practica || !estado_previo || !fenomenologia_somatica || !estado_post) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const userId = req.user?.id ?? null;

      const result = testDb.prepare(
        `INSERT INTO journal_entries (
          fecha, hora, duracion, tipo_practica,
          estado_previo, fenomenologia_somatica, fenomenologia_cognitiva,
          cuerpo, insight, integracion, estado_post,
          energy_pre, valence_pre, energy_post, valence_post,
          bienestar_logros, bienestar_relaciones, bienestar_sentido,
          bienestar_emociones, bienestar_entrega,
          user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        fecha,
        req.body.hora || '',
        Number(req.body.duracion) || 0,
        tipo_practica,
        estado_previo,
        fenomenologia_somatica,
        req.body.fenomenologia_cognitiva || null,
        req.body.cuerpo || null,
        req.body.insight || null,
        req.body.integracion || null,
        estado_post,
        null, null, null, null,
        null, null, null, null, null,
        userId
      );

      res.status(201).json({ ok: true, id: result.lastInsertRowid });
    });

    return expressApp;
  }

  describe('POST /api/auth/login', () => {
    it('should return 400 if username is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('username and password required');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('username and password required');
    });

    it('should return 401 if user does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid credentials');
    });

    it('should return 401 if password is incorrect', async () => {
      createTestUser(db, 'testuser', 'correctpassword');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid credentials');
    });

    it('should return token and user on successful login', async () => {
      createTestUser(db, 'testuser', 'password123');

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toEqual({
        id: 1,
        username: 'testuser',
        role: 'user'
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('unauthorized');
    });

    it('should return user info if authenticated', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: userId,
        username: 'testuser',
        role: 'user'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should delete session on logout', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
      expect(session).toBeUndefined();
    });
  });

  describe('GET /api/habits', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/habits');
      expect(res.status).toBe(401);
    });

    it('should return habits for authenticated user', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      db.prepare('INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)')
        .run('Test Habit', '#FF0000', 5, userId);

      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Test Habit');
    });
  });

  describe('POST /api/habits', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/habits')
        .send({ name: 'New Habit', color: '#00FF00' });

      expect(res.status).toBe(401);
    });

    it('should return 400 if name is missing', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ color: '#00FF00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('name and color are required');
    });

    it('should create habit on success', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Habit', color: '#00FF00', maxPerDay: 10 });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);

      const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId);
      expect(habits).toHaveLength(1);
      expect((habits[0] as any).name).toBe('New Habit');
    });
  });

  describe('DELETE /api/habits/:id', () => {
    it('should return 400 for invalid ID', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .delete('/api/habits/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid ID');
    });

    it('should return 404 if habit not found', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .delete('/api/habits/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should delete habit if user owns it', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const result = db.prepare('INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)')
        .run('Test Habit', '#FF0000', 5, userId);
      const habitId = result.lastInsertRowid;

      const res = await request(app)
        .delete(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId);
      expect(habit).toBeUndefined();
    });
  });

  describe('POST /api/log', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/log')
        .send({ habitId: 1, date: '2024-01-01' });

      expect(res.status).toBe(401);
    });

    it('should return 400 if habitId is missing', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/log')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2024-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('habitId and date are required');
    });

    it('should return 404 if habit does not exist', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/log')
        .set('Authorization', `Bearer ${token}`)
        .send({ habitId: 999, date: '2024-01-01' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Habit not found');
    });

    it('should create log entry on success', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const habitResult = db.prepare('INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)')
        .run('Test Habit', '#FF0000', 5, userId);
      const habitId = habitResult.lastInsertRowid;

      const res = await request(app)
        .post('/api/log')
        .set('Authorization', `Bearer ${token}`)
        .send({ habitId, date: '2024-01-01' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ?').get(habitId, userId);
      expect(log).toBeDefined();
      expect((log as any).count).toBe(1);
    });

    it('should increment count on existing log', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const habitResult = db.prepare('INSERT INTO habits (name, color, max_per_day, user_id) VALUES (?, ?, ?, ?)')
        .run('Test Habit', '#FF0000', 5, userId);
      const habitId = habitResult.lastInsertRowid;

      db.prepare('INSERT INTO habit_logs (habit_id, log_date, count, user_id) VALUES (?, ?, ?, ?)')
        .run(habitId, '2024-01-01', 2, userId);

      await request(app)
        .post('/api/log')
        .set('Authorization', `Bearer ${token}`)
        .send({ habitId, date: '2024-01-01' });

      const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ?').get(habitId, userId);
      expect((log as any).count).toBe(3);
    });
  });

  describe('GET /api/journal', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/journal');
      expect(res.status).toBe(401);
    });

    it('should return journal entries for authenticated user', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      db.prepare(`
        INSERT INTO journal_entries (fecha, tipo_practica, estado_previo, fenomenologia_somatica, estado_post, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('2024-01-01', 'mindfulness', 'calm', 'relaxed', 'peaceful', userId);

      const res = await request(app)
        .get('/api/journal')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].fecha).toBe('2024-01-01');
    });
  });

  describe('POST /api/journal', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/journal')
        .send({
          fecha: '2024-01-01',
          tipo_practica: 'mindfulness',
          estado_previo: 'calm',
          fenomenologia_somatica: 'relaxed',
          estado_post: 'peaceful'
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 if required fields are missing', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/journal')
        .set('Authorization', `Bearer ${token}`)
        .send({ fecha: '2024-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should create journal entry on success', async () => {
      const userId = createTestUser(db, 'testuser', 'password123');
      const token = createTestSession(db, userId as number);

      const res = await request(app)
        .post('/api/journal')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fecha: '2024-01-01',
          hora: '10:00',
          duracion: 30,
          tipo_practica: 'mindfulness',
          estado_previo: 'calm',
          fenomenologia_somatica: 'relaxed',
          estado_post: 'peaceful'
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.id).toBeDefined();

      const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(res.body.id);
      expect(entry).toBeDefined();
      expect((entry as any).fecha).toBe('2024-01-01');
    });
  });
});