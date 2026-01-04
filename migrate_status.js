const db = require('./services/databaseService');

async function runMigration() {
    try {
        console.log("🛠️ Dropping old status check constraint...");
        await db.query(`ALTER TABLE fl_models DROP CONSTRAINT IF EXISTS fl_models_status_check`);

        console.log("🛠️ Adding updated status check constraint (including 'deleted')...");
        await db.query(`ALTER TABLE fl_models ADD CONSTRAINT fl_models_status_check CHECK (status IN ('active', 'paused', 'completed', 'deleted'))`);

        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
