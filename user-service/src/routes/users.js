const express = require('express');
const { pool } = require('../db/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Helper for local logging inside the user-service database
async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1, $2, $3, $4, $5)',
      [level, event, userId, message, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error(`[USER-LOG] Failed to log event: ${err.message}`);
  }
}

// GET /api/users/profile (JWT Protected)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    let result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user.sub]);
    
    // If no profile exists, create a default one
    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2) RETURNING *',
        [req.user.sub, req.user.username]
      );
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[USER] Get profile error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile (JWT Protected)
router.put('/profile', authMiddleware, async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE user_profiles 
       SET display_name = COALESCE($1, display_name), 
           bio = COALESCE($2, bio), 
           avatar_url = COALESCE($3, avatar_url), 
           updated_at = NOW() 
       WHERE user_id = $4 
       RETURNING *`,
      [display_name, bio, avatar_url, req.user.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await logEvent({
      level: 'INFO',
      event: 'PROFILE_UPDATED',
      userId: req.user.sub,
      message: `User ${req.user.username} updated their profile`,
      meta: { display_name }
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[USER] Update profile error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/all (JWT Protected)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, display_name, avatar_url FROM user_profiles');
    res.json(result.rows);
  } catch (err) {
    console.error('[USER] Get all profiles error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
