require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function dumpData() {
    try {
        const models = await pool.query('SELECT * FROM fl_models');
        const rounds = await pool.query('SELECT * FROM fl_rounds');
        const contributions = await pool.query('SELECT * FROM fl_contributions');

        const data = {
            models: models.rows,
            rounds: rounds.rows,
            contributions: contributions.rows
        };

        fs.writeFileSync('fl_dump.json', JSON.stringify(data, null, 2));
        console.log("Data dumped to fl_dump.json");

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

dumpData();
