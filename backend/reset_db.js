const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function getConnection() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  };

  if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }

  return await mysql.createConnection(connectionConfig);
}

async function dropDatabase() {
  const dbName = process.env.DB_NAME || 'internship_tracker';
  let connection;
  try {
    console.log(`Connecting to MySQL server at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}...`);
    connection = await getConnection();
    console.log(`🗑️  Dropping database '${dbName}' if it exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`✅ Database '${dbName}' deleted successfully.`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

async function resetDatabase() {
  const dbName = process.env.DB_NAME || 'internship_tracker';
  let connection;
  try {
    console.log(`Connecting to MySQL server at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}...`);
    connection = await getConnection();
    
    console.log(`🗑️  Dropping database '${dbName}' if it exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`✅ Database '${dbName}' deleted successfully.`);

    console.log(`📦 Recreating database '${dbName}' and initializing schema...`);
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('✅ Schema initialized and default seed data loaded successfully!');
    } else {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      console.log(`✅ Database '${dbName}' recreated (no schema.sql found).`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

const arg = process.argv[2];
if (arg === '--drop') {
  dropDatabase();
} else {
  resetDatabase();
}
