const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:secret@auth-db:5432/authdb',
});

module.exports = { pool };
