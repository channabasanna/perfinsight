import { Router, Request, Response } from 'express';
import db from '../database';
import { runComparison, TransactionRow } from '../utils/comparisonEngine';

const router = Router();

// GET /api/comparison?baseline=:id&compare=:id
router.get('/', (req: Request, res: Response) => {
  try {
    const { baseline, compare } = req.query;

    if (!baseline || !compare) {
      return res.status(400).json({ success: false, message: 'baseline and compare query parameters are required' });
    }

    const baselineRun = db.prepare(`
      SELECT tr.*, sp.name as subproject_name, p.name as project_name, p.customer_name
      FROM test_runs tr
      JOIN sub_projects sp ON sp.id = tr.sub_project_id
      JOIN projects p ON p.id = sp.project_id
      WHERE tr.id = ?
    `).get(baseline as string);

    if (!baselineRun) {
      return res.status(404).json({ success: false, message: 'Baseline test run not found' });
    }

    const compareRun = db.prepare(`
      SELECT tr.*, sp.name as subproject_name, p.name as project_name, p.customer_name
      FROM test_runs tr
      JOIN sub_projects sp ON sp.id = tr.sub_project_id
      JOIN projects p ON p.id = sp.project_id
      WHERE tr.id = ?
    `).get(compare as string);

    if (!compareRun) {
      return res.status(404).json({ success: false, message: 'Comparison test run not found' });
    }

    // Enforce same sub-project
    const baselineSubProjectId = (baselineRun as { sub_project_id: number }).sub_project_id;
    const compareSubProjectId = (compareRun as { sub_project_id: number }).sub_project_id;
    if (baselineSubProjectId !== compareSubProjectId) {
      return res.status(400).json({
        success: false,
        message: 'Comparison is only allowed between test runs within the same sub-project.',
      });
    }

    // Load transaction filters for the sub-project (from baseline run)
    const baselineRunTyped = baselineRun as { sub_project_id: number };
    const filterRow = db.prepare('SELECT transaction_filters FROM sub_projects WHERE id = ?')
      .get(baselineRunTyped.sub_project_id) as { transaction_filters: string | null } | undefined;
    const activeFilters: string[] = filterRow?.transaction_filters
      ? JSON.parse(filterRow.transaction_filters)
      : [];

    let baselineTransactions = db.prepare(
      'SELECT * FROM transactions WHERE test_run_id = ?'
    ).all(baseline as string) as TransactionRow[];

    let compareTransactions = db.prepare(
      'SELECT * FROM transactions WHERE test_run_id = ?'
    ).all(compare as string) as TransactionRow[];

    if (activeFilters.length > 0) {
      baselineTransactions = baselineTransactions.filter((t) => activeFilters.includes(t.name));
      compareTransactions = compareTransactions.filter((t) => activeFilters.includes(t.name));
    }

    const result = runComparison(baselineTransactions, compareTransactions);

    return res.json({
      success: true,
      data: {
        baseline: baselineRun,
        compare: compareRun,
        ...result,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ success: false, message });
  }
});

export default router;
