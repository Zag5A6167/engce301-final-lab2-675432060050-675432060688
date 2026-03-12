const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:secret@user-db:5432/userdb',
});

module.exports = { pool };
