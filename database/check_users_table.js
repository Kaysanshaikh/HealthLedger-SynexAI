const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();

        console.log('--- TABLES ---');
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        tables.rows.forEach(r => console.log(`  - ${r.table_name}`));

        console.log('\n--- USERS COLUMNS ---');
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
        res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

check();
