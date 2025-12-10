/**
 * Initialize Neon PostgreSQL Database for Production
 * Run this script after creating your Neon database
 */

require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function initializeNeonDB() {
    console.log("🚀 Initializing Neon PostgreSQL Database...\n");

    // Validate environment variables
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL not found in environment variables");
        console.error("   Please set DATABASE_URL in your .env file");
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        // Connect to database
        console.log("📡 Connecting to Neon database...");
        await client.connect();
        console.log("✅ Connected successfully\n");

        // Read SQL file
        const sqlPath = path.join(__dirname, "init_fl_local.sql");

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL file not found: ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, "utf8");

        // Split SQL into individual statements (skip DROP DATABASE and CREATE DATABASE)
        const statements = sql
            .split(";")
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .filter(s => !s.includes("DROP DATABASE"))
            .filter(s => !s.includes("CREATE DATABASE"))
            .filter(s => !s.includes("\\c healthledger_fl_local"))
            .filter(s => !s.includes("COMMENT ON DATABASE"));

        console.log(`📝 Executing ${statements.length} SQL statements...\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            try {
                await client.query(statement);

                // Log progress for important statements
                if (statement.includes("CREATE TABLE")) {
                    const tableName = statement.match(/CREATE TABLE (\w+)/)?.[1];
                    console.log(`✅ Created table: ${tableName}`);
                } else if (statement.includes("CREATE INDEX")) {
                    const indexName = statement.match(/CREATE INDEX (\w+)/)?.[1];
                    console.log(`✅ Created index: ${indexName}`);
                } else if (statement.includes("CREATE VIEW")) {
                    const viewName = statement.match(/CREATE VIEW (\w+)/)?.[1];
                    console.log(`✅ Created view: ${viewName}`);
                } else if (statement.includes("INSERT INTO")) {
                    const tableName = statement.match(/INSERT INTO (\w+)/)?.[1];
                    console.log(`✅ Inserted data into: ${tableName}`);
                }
            } catch (error) {
                console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                console.error(`   Statement: ${statement.substring(0, 100)}...`);
            }
        }

        console.log("\n📊 Verifying database setup...\n");

        // Verify tables created
        const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log("✅ Tables created:");
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Count initial data
        const participantsResult = await client.query("SELECT COUNT(*) FROM fl_participants");
        console.log(`\n✅ Initial participants: ${participantsResult.rows[0].count}`);

        console.log("\n🎉 Database initialization complete!");
        console.log("\n📋 Next steps:");
        console.log("   1. Deploy smart contract to Polygon Amoy");
        console.log("   2. Update CONTRACT_ADDRESS in .env");
        console.log("   3. Register FL participants");
        console.log("   4. Create FL models\n");

    } catch (error) {
        console.error("\n❌ Database initialization failed:", error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run if executed directly
if (require.main === module) {
    initializeNeonDB()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { initializeNeonDB };
