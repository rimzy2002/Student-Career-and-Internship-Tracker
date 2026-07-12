const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'internship_tracker',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
};

// Aiven MySQL requires SSL
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = mysql.createPool(poolConfig);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully.');
    console.log(`- SSL Mode: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'}`);
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to the database.');
    console.error(`- SSL Mode: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'}`);
    console.error('- Ensure your .env credentials are correct (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).');
    console.error('- If using Aiven, ensure your current IP is added to the allowlist.');
    console.error('Error Details:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection
};
