// Test .env file loading
require("dotenv").config();

console.log("🔍 Environment Variables Check:\n");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");
console.log("PGHOST:", process.env.PGHOST || "Not set");
console.log("PGDATABASE:", process.env.PGDATABASE || "Not set");
console.log("PGUSER:", process.env.PGUSER || "Not set");
console.log("PGPASSWORD:", process.env.PGPASSWORD ? "✅ Set (hidden)" : "❌ Not set");
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Not set");
console.log("CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS || "Not set");
console.log("\nFull DATABASE_URL (first 50 chars):");
console.log(process.env.DATABASE_URL?.substring(0, 50) || "Not set");
