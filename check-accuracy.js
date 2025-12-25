require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkAccuracy() {
    try {
        const res = await pool.query('SELECT model_id, disease, accuracy, loss FROM fl_models');
        console.log("=== MODELS ===");
        res.rows.forEach(r => console.log(`${r.disease} (${r.model_id}): Acc=${r.accuracy}, Loss=${r.loss}`));

        const rounds = await pool.query('SELECT round_id, model_id, round_number, status FROM fl_rounds ORDER BY start_time DESC LIMIT 5');
        console.log("\n=== RECENT ROUNDS ===");
        rounds.rows.forEach(r => console.log(`Round ${r.round_id} (Mod: ${r.model_id}): Num=${r.round_number}, Status=${r.status}`));

        const contributions = await pool.query('SELECT contribution_id, round_id, participant_address, local_accuracy FROM fl_contributions ORDER BY submitted_at DESC LIMIT 5');
        console.log("\n=== RECENT CONTRIBUTIONS ===");
        contributions.rows.forEach(r => console.log(`Contrib ${r.contribution_id} (Round: ${r.round_id}): Addr=${r.participant_address}, Acc=${r.local_accuracy}`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAccuracy();
