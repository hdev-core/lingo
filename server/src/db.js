const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  statement_timeout: 10000,
});

// Idle pooled clients can emit errors when Postgres/Supabase recycles a
// connection or during a network interruption. Handle the event so one
// dropped idle connection does not terminate the API process.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = { pool };