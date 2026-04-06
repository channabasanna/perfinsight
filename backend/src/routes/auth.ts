import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db, { hashPassword, verifyPassword } from '../database';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'perf-insight-secret-change-me';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  return res.json({ success: true, data: { token, username: user.username, role: user.role } });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    return res.json({ success: true, data: { id: payload.id, username: payload.username, role: payload.role } });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// GET /api/auth/users  (admin only)
router.get('/users', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.role, u.created_at,
        GROUP_CONCAT(upa.project_id) as project_ids
      FROM users u
      LEFT JOIN user_project_access upa ON upa.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `).all() as Array<{ id: number; username: string; role: string; created_at: string; project_ids: string | null }>;

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      created_at: u.created_at,
      project_ids: u.project_ids ? u.project_ids.split(',').map(Number) : [],
    }));

    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// POST /api/auth/users  (admin only)
router.post('/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, password, role, project_ids } = req.body as {
      username: string;
      password: string;
      role: 'admin' | 'user';
      project_ids: number[];
    };

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be admin or user' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).run(username, hashPassword(password), role);

    const userId = result.lastInsertRowid as number;

    if (Array.isArray(project_ids) && project_ids.length > 0) {
      const insertAccess = db.prepare('INSERT OR IGNORE INTO user_project_access (user_id, project_id) VALUES (?, ?)');
      for (const pid of project_ids) {
        insertAccess.run(userId, pid);
      }
    }

    return res.status(201).json({ success: true, data: { id: userId, username, role, project_ids: project_ids || [] } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// PUT /api/auth/users/:id  (admin only)
router.put('/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, role, project_ids } = req.body as {
      password?: string;
      role?: 'admin' | 'user';
      project_ids?: number[];
    };

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent demoting the last admin
    if (role && role !== 'admin' && user.role === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }).count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot change role of the last admin user' });
      }
    }

    if (password) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
    }
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    }

    if (Array.isArray(project_ids)) {
      db.prepare('DELETE FROM user_project_access WHERE user_id = ?').run(id);
      const insertAccess = db.prepare('INSERT OR IGNORE INTO user_project_access (user_id, project_id) VALUES (?, ?)');
      for (const pid of project_ids) {
        insertAccess.run(id, pid);
      }
    }

    return res.json({ success: true, message: 'User updated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// DELETE /api/auth/users/:id  (admin only)
router.delete('/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }).count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
      }
    }

    // Prevent self-deletion
    const requestingUser = (req as Request & { user?: { id: number } }).user;
    if (requestingUser && requestingUser.id === Number(id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
