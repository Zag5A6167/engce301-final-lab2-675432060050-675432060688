const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken } = require('../middleware/jwtUtils');

const router = express.Router();

// Helper for local logging inside the service database
async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1, $2, $3, $4, $5)',
      [level, event, userId, message, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error(`[AUTH-LOG] Failed to log event: ${err.message}`);
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, hashedPassword, email.toLowerCase()]
    );

    const user = result.rows[0];
    await logEvent({
      level: 'INFO',
      event: 'REGISTER_SUCCESS',
      userId: user.id,
      message: `User ${username} registered successfully`,
      meta: { username, email }
    });

    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('[AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await logEvent({
        level: 'WARN',
        event: 'LOGIN_FAILED',
        message: `Login failed for username: ${username}`,
        meta: { username }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ sub: user.id, username: user.username, email: user.email });

    await logEvent({
      level: 'INFO',
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      message: `User ${username} logged in`,
      meta: { username }
    });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me (Internal/Verify)
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { verifyToken } = require('../middleware/jwtUtils');
    const decoded = verifyToken(token);
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
