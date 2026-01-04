const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_K9CshM1uUpRE@ep-solitary-cloud-a1j8clto-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function checkFLStatus() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('--- MODELS ---');
        const modelsRes = await client.query('SELECT model_id, disease, current_round FROM fl_models');
        console.table(modelsRes.rows);

        console.log('\n--- ACTIVE ROUNDS ---');
        const roundsRes = await client.query(`
            SELECT r.round_id, m.disease, r.round_number, r.status, 
                   (SELECT COUNT(*) FROM fl_contributions WHERE round_id = r.round_id) as contributions
            FROM fl_rounds r
            JOIN fl_models m ON r.model_id = m.model_id
            WHERE r.status != 'completed'
        `);
        console.table(roundsRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkFLStatus();
