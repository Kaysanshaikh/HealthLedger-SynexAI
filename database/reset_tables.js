const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function reset() {
    try {
        await client.connect();
        console.log('📡 Connected to database for reset...');

        const tablesToDrop = [
            'health_records',
            'patients',
            'doctors',
            'diagnostic_centers',
            'users',
            'v_model_performance',
            'v_participant_leaderboard'
        ];

        for (const table of tablesToDrop) {
            try {
                if (table.startsWith('v_')) {
                    await client.query(`DROP VIEW IF EXISTS ${table} CASCADE`);
                    console.log(`✅ Dropped view: ${table}`);
                } else {
                    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                    console.log(`✅ Dropped table: ${table}`);
                }
            } catch (e) {
                console.error(`❌ Failed to drop ${table}:`, e.message);
            }
        }

        console.log('\n🎉 Reset complete. Ready for initNeonDB.js');
        await client.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

reset();
