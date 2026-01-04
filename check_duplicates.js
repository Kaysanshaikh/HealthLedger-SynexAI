const db = require('./services/databaseService');

async function checkDuplicates() {
    try {
        const res = await db.query(`
            SELECT disease, model_type, COUNT(*) 
            FROM fl_models 
            WHERE status != 'deleted' OR status IS NULL 
            GROUP BY disease, model_type 
            HAVING COUNT(*) > 1
        `);
        if (res.rows.length > 0) {
            console.log("⚠️ Found duplicate active models:");
            console.table(res.rows);
        } else {
            console.log("✅ No duplicate active models found.");
        }
        process.exit(0);
    } catch (err) {
        console.error("❌ Error checking duplicates:", err);
        process.exit(1);
    }
}

checkDuplicates();
