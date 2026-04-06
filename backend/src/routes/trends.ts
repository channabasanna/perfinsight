import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

// GET /api/trends/:subprojectId?transactionName=:name&filter=good|all
router.get('/:subprojectId', (req: Request, res: Response) => {
  try {
    const { subprojectId } = req.params;
    const { transactionName, filter } = req.query;

    const subproject = db.prepare('SELECT * FROM sub_projects WHERE id = ?').get(subprojectId);
    if (!subproject) {
      return res.status(404).json({ success: false, message: 'SubProject not found' });
    }

    // Get all test runs for this subproject
    let statusFilter = '';
    if (filter === 'good') {
      statusFilter = "AND tr.status = 'good'";
    }

    if (transactionName) {
      // Return trend data for a specific transaction
      const trendData = db.prepare(`
        SELECT
          tr.id as test_run_id,
          tr.name as test_run_name,
          tr.build,
          tr.user_load,
          tr.execution_date,
          tr.status,
          t.name as transaction_name,
          t.avg_response_time,
          t.p90_response_time,
          t.p95_response_time,
          t.p99_response_time,
          t.throughput,
          t.error_rate,
          t.samples,
          t.kb_per_sec
        FROM test_runs tr
        JOIN transactions t ON t.test_run_id = tr.id
        WHERE tr.sub_project_id = ?
          AND t.name = ?
          ${statusFilter}
        ORDER BY tr.execution_date ASC, tr.created_at ASC
      `).all(subprojectId, transactionName as string);

      return res.json({ success: true, data: trendData });
    }

    // Return list of available transaction names
    const transactionNames = db.prepare(`
      SELECT DISTINCT t.name
      FROM transactions t
      JOIN test_runs tr ON tr.id = t.test_run_id
      WHERE tr.sub_project_id = ?
      ORDER BY t.name ASC
    `).all(subprojectId);

    // Return summary trend data (all transactions aggregated per test run)
    const testRunSummary = db.prepare(`
      SELECT
        tr.id as test_run_id,
        tr.name as test_run_name,
        tr.build,
        tr.user_load,
        tr.execution_date,
        tr.status,
        COUNT(t.id) as transaction_count,
        AVG(t.avg_response_time) as avg_response_time,
        AVG(t.p90_response_time) as p90_response_time,
        AVG(t.throughput) as avg_throughput,
        AVG(t.error_rate) as avg_error_rate
      FROM test_runs tr
      LEFT JOIN transactions t ON t.test_run_id = tr.id
      WHERE tr.sub_project_id = ?
        ${statusFilter}
      GROUP BY tr.id
      ORDER BY tr.execution_date ASC, tr.created_at ASC
    `).all(subprojectId);

    return res.json({
      success: true,
      data: {
        transactionNames: (transactionNames as Record<string, unknown>[]).map((r) => r.name),
        testRunSummary,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
