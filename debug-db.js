// Debug DATABASE_URL
require("dotenv").config();

console.log("Full DATABASE_URL:");
console.log(process.env.DATABASE_URL);
console.log("\nPassword extracted from URL:");
const match = process.env.DATABASE_URL?.match(/:([^@]+)@/);
if (match) {
    console.log("Password:", match[1]);
}
