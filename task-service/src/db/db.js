const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:secret@task-db:5432/taskdb',
});

module.exports = { pool };
