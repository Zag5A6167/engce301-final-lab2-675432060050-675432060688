const express = require('express');
const { pool } = require('../db/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Helper for local logging inside the task-service database
async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1, $2, $3, $4, $5)',
      [level, event, userId, message, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error(`[TASK-LOG] Failed to log event: ${err.message}`);
  }
}

// GET /api/tasks (JWT Protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.user.sub]);
    res.json(result.rows);
  } catch (err) {
    console.error('[TASK] Get tasks error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks (JWT Protected)
router.post('/', authMiddleware, async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.sub, title, description]
    );

    const task = result.rows[0];
    await logEvent({
      level: 'INFO',
      event: 'TASK_CREATED',
      userId: req.user.sub,
      message: `Task "${title}" created by user ${req.user.username}`,
      meta: { taskId: task.id }
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('[TASK] Create task error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
