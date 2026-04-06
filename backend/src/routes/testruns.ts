import { Router, Request, Response } from 'express';
import db from '../database';
import { upload } from '../middleware/upload';
import { parseTestResultFile } from '../utils/fileParser';
import path from 'path';
import fs from 'fs';

const router = Router({ mergeParams: true });

// GET /api/subprojects/:subprojectId/testruns
router.get('/', (req: Request, res: Response) => {
  try {
    const testruns = db.prepare(`
      SELECT
        tr.*,
        COUNT(t.id) as transaction_count
      FROM test_runs tr
      LEFT JOIN transactions t ON t.test_run_id = tr.id
      WHERE tr.sub_project_id = ?
      GROUP BY tr.id
      ORDER BY tr.execution_date DESC, tr.created_at DESC
    `).all(req.params.subprojectId);

    res.json({ success: true, data: testruns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/subprojects/:subprojectId/testruns
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { subprojectId } = req.params;
    const { name, build, user_load, test_tool, execution_date, notes } = req.body;

    if (!name || !execution_date) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'name and execution_date are required' });
    }

    const subproject = db.prepare('SELECT id FROM sub_projects WHERE id = ?').get(subprojectId);
    if (!subproject) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    const filePath = req.file ? req.file.path : null;

    const result = db.prepare(`
      INSERT INTO test_runs (sub_project_id, name, build, user_load, test_tool, execution_date, status, notes, file_path)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(subprojectId, name, build || null, user_load ? parseInt(user_load) : null, test_tool || 'Custom', execution_date, notes || null, filePath);

    const testRunId = result.lastInsertRowid;

    // Parse and store transactions if file was uploaded
    if (filePath) {
      try {
        const transactions = parseTestResultFile(filePath);

        const insertTx = db.prepare(`
          INSERT INTO transactions (test_run_id, name, samples, avg_response_time, min_response_time, max_response_time, p90_response_time, p95_response_time, p99_response_time, error_rate, throughput, kb_per_sec)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((txns: ReturnType<typeof parseTestResultFile>) => {
          for (const t of txns) {
            insertTx.run(testRunId, t.name, t.samples, t.avg_response_time, t.min_response_time, t.max_response_time, t.p90_response_time, t.p95_response_time, t.p99_response_time, t.error_rate, t.throughput, t.kb_per_sec);
          }
        });
        insertMany(transactions);
      } catch (parseErr: unknown) {
        const parseMsg = parseErr instanceof Error ? parseErr.message : 'Parse error';
        // Delete the test run if parsing fails
        db.prepare('DELETE FROM test_runs WHERE id = ?').run(testRunId);
        fs.unlinkSync(filePath);
        return res.status(400).json({ success: false, message: `File parse error: ${parseMsg}` });
      }
    }

    const testRun = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(testRunId);
    return res.status(201).json({ success: true, data: testRun });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

// GET /api/testruns/:id
export const getTestRun = (req: Request, res: Response) => {
  try {
    const testRun = db.prepare(`
      SELECT
        tr.*,
        sp.name as subproject_name,
        sp.project_id,
        p.name as project_name,
        p.customer_name,
        COUNT(t.id) as transaction_count
      FROM test_runs tr
      JOIN sub_projects sp ON sp.id = tr.sub_project_id
      JOIN projects p ON p.id = sp.project_id
      LEFT JOIN transactions t ON t.test_run_id = tr.id
      WHERE tr.id = ?
      GROUP BY tr.id
    `).get(req.params.id);

    if (!testRun) {
      return res.status(404).json({ success: false, message: 'Test run not found' });
    }
    return res.json({ success: true, data: testRun });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
};

// PUT /api/testruns/:id
export const updateTestRun = (req: Request, res: Response) => {
  try {
    const { status, notes, name, build, user_load, test_tool, execution_date } = req.body;

    const existing = db.prepare('SELECT id FROM test_runs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Test run not found' });
    }

    const current = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    db.prepare(`
      UPDATE test_runs
      SET status = ?, notes = ?, name = ?, build = ?, user_load = ?, test_tool = ?, execution_date = ?
      WHERE id = ?
    `).run(
      status || current.status,
      notes !== undefined ? notes : current.notes,
      name || current.name,
      build !== undefined ? build : current.build,
      user_load !== undefined ? user_load : current.user_load,
      test_tool || current.test_tool,
      execution_date || current.execution_date,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
};

// DELETE /api/testruns/:id
export const deleteTestRun = (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Test run not found' });
    }

    // Delete file if exists
    if (existing.file_path && typeof existing.file_path === 'string') {
      const absolutePath = path.resolve(existing.file_path);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    db.prepare('DELETE FROM test_runs WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Test run deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
};

// GET /api/testruns/:id/transactions
export const getTransactions = (req: Request, res: Response) => {
  try {
    const testRun = db.prepare('SELECT id FROM test_runs WHERE id = ?').get(req.params.id);
    if (!testRun) {
      return res.status(404).json({ success: false, message: 'Test run not found' });
    }

    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE test_run_id = ? ORDER BY name ASC
    `).all(req.params.id);

    return res.json({ success: true, data: transactions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
};

// GET /api/subprojects/:subprojectId/testruns/all - for comparison selectors
router.get('/all', (req: Request, res: Response) => {
  try {
    const testruns = db.prepare(`
      SELECT tr.* FROM test_runs tr
      WHERE tr.sub_project_id = ?
      ORDER BY tr.execution_date DESC
    `).all(req.params.subprojectId);
    res.json({ success: true, data: testruns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
