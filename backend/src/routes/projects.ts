import { Router, Request, Response } from 'express';
import db from '../database';
import { requireAdmin } from '../middleware/auth';

const router = Router();

function getUserProjectIds(req: Request): number[] | null {
  const user = req.user;
  if (!user) return [];
  if (user.role === 'admin') return null; // null = all projects
  const rows = db.prepare('SELECT project_id FROM user_project_access WHERE user_id = ?').all(user.id) as { project_id: number }[];
  return rows.map((r) => r.project_id);
}

// GET /api/projects
router.get('/', (req: Request, res: Response) => {
  try {
    const projectIds = getUserProjectIds(req);

    let projects: unknown[];
    if (projectIds === null) {
      // Admin: see all
      projects = db.prepare(`
        SELECT
          p.*,
          COUNT(DISTINCT sp.id) as subproject_count,
          COUNT(DISTINCT tr.id) as test_run_count
        FROM projects p
        LEFT JOIN sub_projects sp ON sp.project_id = p.id
        LEFT JOIN test_runs tr ON tr.sub_project_id = sp.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all();
    } else if (projectIds.length === 0) {
      projects = [];
    } else {
      const placeholders = projectIds.map(() => '?').join(',');
      projects = db.prepare(`
        SELECT
          p.*,
          COUNT(DISTINCT sp.id) as subproject_count,
          COUNT(DISTINCT tr.id) as test_run_count
        FROM projects p
        LEFT JOIN sub_projects sp ON sp.project_id = p.id
        LEFT JOIN test_runs tr ON tr.sub_project_id = sp.id
        WHERE p.id IN (${placeholders})
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all(...projectIds);
    }

    res.json({ success: true, data: projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/projects  (admin only)
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, customer_name, description } = req.body;

    if (!name || !customer_name) {
      return res.status(400).json({ success: false, message: 'name and customer_name are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO projects (name, customer_name, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(name, customer_name, description || null);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// GET /api/projects/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const projectIds = getUserProjectIds(req);

    // Non-admin: check access
    if (projectIds !== null && !projectIds.includes(Number(req.params.id))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const project = db.prepare(`
      SELECT
        p.*,
        COUNT(DISTINCT sp.id) as subproject_count,
        COUNT(DISTINCT tr.id) as test_run_count
      FROM projects p
      LEFT JOIN sub_projects sp ON sp.project_id = p.id
      LEFT JOIN test_runs tr ON tr.sub_project_id = sp.id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    return res.json({ success: true, data: project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// PUT /api/projects/:id  (admin only)
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, customer_name, description } = req.body;

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    db.prepare(`
      UPDATE projects SET name = ?, customer_name = ?, description = ? WHERE id = ?
    `).run(name, customer_name, description || null, req.params.id);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// DELETE /api/projects/:id  (admin only)
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
