import { Router, Request, Response } from 'express';
import db from '../database';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/subprojects
router.get('/', (req: Request, res: Response) => {
  try {
    const subprojects = db.prepare(`
      SELECT
        sp.*,
        COUNT(DISTINCT tr.id) as test_run_count,
        SUM(CASE WHEN tr.status = 'good' THEN 1 ELSE 0 END) as good_run_count,
        MAX(tr.execution_date) as last_run_date
      FROM sub_projects sp
      LEFT JOIN test_runs tr ON tr.sub_project_id = sp.id
      WHERE sp.project_id = ?
      GROUP BY sp.id
      ORDER BY sp.created_at DESC
    `).all(req.params.projectId);

    res.json({ success: true, data: subprojects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/projects/:projectId/subprojects  (admin only)
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const { projectId } = req.params;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const result = db.prepare(`
      INSERT INTO sub_projects (project_id, name, description)
      VALUES (?, ?, ?)
    `).run(projectId, name, description || null);

    const subproject = db.prepare('SELECT * FROM sub_projects WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: subproject });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// GET /api/projects/:projectId/subprojects/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const subproject = db.prepare(`
      SELECT
        sp.*,
        p.name as project_name,
        p.customer_name,
        COUNT(DISTINCT tr.id) as test_run_count,
        SUM(CASE WHEN tr.status = 'good' THEN 1 ELSE 0 END) as good_run_count,
        MAX(tr.execution_date) as last_run_date
      FROM sub_projects sp
      JOIN projects p ON p.id = sp.project_id
      LEFT JOIN test_runs tr ON tr.sub_project_id = sp.id
      WHERE sp.id = ? AND sp.project_id = ?
      GROUP BY sp.id
    `).get(req.params.id, req.params.projectId);

    if (!subproject) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }
    return res.json({ success: true, data: subproject });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// PUT /api/projects/:projectId/subprojects/:id  (admin only)
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const existing = db.prepare('SELECT id FROM sub_projects WHERE id = ? AND project_id = ?').get(req.params.id, req.params.projectId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    db.prepare(`
      UPDATE sub_projects SET name = ?, description = ? WHERE id = ?
    `).run(name, description || null, req.params.id);

    const updated = db.prepare('SELECT * FROM sub_projects WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// GET /api/projects/:projectId/subprojects/:id/filters
router.get('/:id/filters', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT transaction_filters FROM sub_projects WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.params.projectId) as { transaction_filters: string | null } | undefined;

    if (!row) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    const filters: string[] = row.transaction_filters ? JSON.parse(row.transaction_filters) : [];
    return res.json({ success: true, data: { filters } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// PUT /api/projects/:projectId/subprojects/:id/filters
router.put('/:id/filters', (req: Request, res: Response) => {
  try {
    const { filters } = req.body as { filters: string[] };

    if (!Array.isArray(filters)) {
      return res.status(400).json({ success: false, message: 'filters must be an array of transaction names' });
    }

    const existing = db.prepare('SELECT id FROM sub_projects WHERE id = ? AND project_id = ?')
      .get(req.params.id, req.params.projectId);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    const filtersJson = filters.length > 0 ? JSON.stringify(filters) : null;
    db.prepare('UPDATE sub_projects SET transaction_filters = ? WHERE id = ?')
      .run(filtersJson, req.params.id);

    return res.json({ success: true, data: { filters } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// DELETE /api/projects/:projectId/subprojects/:id  (admin only)
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT id FROM sub_projects WHERE id = ? AND project_id = ?').get(req.params.id, req.params.projectId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    db.prepare('DELETE FROM sub_projects WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'SubProject deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
