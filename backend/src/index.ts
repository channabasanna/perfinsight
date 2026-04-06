import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { initializeDatabase } from './database';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import subprojectsRouter from './routes/subprojects';
import testRunsRouter, { getTestRun, updateTestRun, deleteTestRun, getTransactions } from './routes/testruns';
import comparisonRouter from './routes/comparison';
import trendsRouter from './routes/trends';
import { requireAuth } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/projects/:projectId/subprojects', requireAuth, subprojectsRouter);
app.use('/api/subprojects/:subprojectId/testruns', requireAuth, testRunsRouter);

// Individual test run routes (not nested under subproject)
app.get('/api/testruns/:id', requireAuth, getTestRun);
app.put('/api/testruns/:id', requireAuth, updateTestRun);
app.delete('/api/testruns/:id', requireAuth, deleteTestRun);
app.get('/api/testruns/:id/transactions', requireAuth, getTransactions);

// Comparison routes
app.use('/api/comparison', requireAuth, comparisonRouter);

// Trends routes
app.use('/api/trends', requireAuth, trendsRouter);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  try {
    const { default: db } = require('./database');
    const user = (req as typeof req & { user?: { id: number; role: string } }).user;

    // Determine accessible project IDs for non-admin users
    let projectIds: number[] | null = null; // null = all
    if (user && user.role !== 'admin') {
      const rows = db.prepare('SELECT project_id FROM user_project_access WHERE user_id = ?').all(user.id) as { project_id: number }[];
      projectIds = rows.map((r: { project_id: number }) => r.project_id);
    }

    const buildProjectFilter = (alias: string) => {
      if (projectIds === null) return '';
      if (projectIds.length === 0) return `AND ${alias}.id IN (SELECT -1)`;
      return `AND ${alias}.id IN (${projectIds.map(() => '?').join(',')})`;
    };
    const projectArgs = projectIds !== null ? projectIds : [];

    const totalProjects = projectIds === null
      ? (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count
      : projectIds.length;

    const totalTestRuns = (db.prepare(
      `SELECT COUNT(*) as count FROM test_runs tr JOIN sub_projects sp ON sp.id = tr.sub_project_id JOIN projects p ON p.id = sp.project_id WHERE 1=1 ${buildProjectFilter('p')}`
    ).get(...projectArgs) as { count: number }).count;

    const goodTests = (db.prepare(
      `SELECT COUNT(*) as count FROM test_runs tr JOIN sub_projects sp ON sp.id = tr.sub_project_id JOIN projects p ON p.id = sp.project_id WHERE tr.status = 'good' ${buildProjectFilter('p')}`
    ).get(...projectArgs) as { count: number }).count;

    const badTests = (db.prepare(
      `SELECT COUNT(*) as count FROM test_runs tr JOIN sub_projects sp ON sp.id = tr.sub_project_id JOIN projects p ON p.id = sp.project_id WHERE tr.status = 'bad' ${buildProjectFilter('p')}`
    ).get(...projectArgs) as { count: number }).count;

    const recentTestRuns = db.prepare(`
      SELECT
        tr.*,
        sp.id as subproject_id,
        sp.name as subproject_name,
        p.id as project_id,
        p.name as project_name,
        p.customer_name,
        COUNT(t.id) as transaction_count
      FROM test_runs tr
      JOIN sub_projects sp ON sp.id = tr.sub_project_id
      JOIN projects p ON p.id = sp.project_id
      LEFT JOIN transactions t ON t.test_run_id = tr.id
      WHERE 1=1 ${buildProjectFilter('p')}
      GROUP BY tr.id
      ORDER BY p.name ASC, sp.name ASC, tr.execution_date DESC
      LIMIT 50
    `).all(...projectArgs);

    const allTestRuns = db.prepare(`
      SELECT tr.id, tr.name, tr.status, tr.execution_date, sp.id as subproject_id, sp.name as subproject_name, p.id as project_id, p.name as project_name
      FROM test_runs tr
      JOIN sub_projects sp ON sp.id = tr.sub_project_id
      JOIN projects p ON p.id = sp.project_id
      WHERE 1=1 ${buildProjectFilter('p')}
      ORDER BY tr.execution_date DESC
    `).all(...projectArgs);

    res.json({
      success: true,
      data: {
        totalProjects,
        totalTestRuns,
        goodTests,
        badTests,
        recentTestRuns,
        allTestRuns,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`PerfInsight backend running on http://localhost:${PORT}`);
});

export default app;
