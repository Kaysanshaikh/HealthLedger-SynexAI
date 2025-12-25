# Quick Production Setup Script
# Run these commands to set up production environment

Write-Host "🚀 HealthLedger FL - Production Setup" -ForegroundColor Green
Write-Host ""

# Step 1: Create .env file
Write-Host "📝 Step 1: Creating .env file..." -ForegroundColor Cyan
Copy-Item ".env.production" ".env" -Force
Write-Host "✅ .env file created from template" -ForegroundColor Green
Write-Host "⚠️  Please edit .env and add your PGPASSWORD and Pinata credentials" -ForegroundColor Yellow
Write-Host ""

# Step 2: Initialize Neon Database
Write-Host "📊 Step 2: Initializing Neon Database..." -ForegroundColor Cyan
Write-Host "   Run: node database/initNeonDB.js" -ForegroundColor White
Write-Host ""

# Step 3: Deploy Contract
Write-Host "📜 Step 3: Deploy Smart Contract to Polygon Amoy..." -ForegroundColor Cyan
Write-Host "   Run: npx hardhat run scripts/deployFL.js --network polygonAmoy" -ForegroundColor White
Write-Host ""

# Step 4: Update CONTRACT_ADDRESS
Write-Host "🔧 Step 4: Update .env with CONTRACT_ADDRESS" -ForegroundColor Cyan
Write-Host "   Copy the deployed contract address to .env" -ForegroundColor White
Write-Host ""

# Step 5: Register Participants
Write-Host "👥 Step 5: Register FL Participants..." -ForegroundColor Cyan
Write-Host "   Run: node scripts/fl/registerParticipants.js" -ForegroundColor White
Write-Host ""

# Step 6: Test
Write-Host "🧪 Step 6: Test Production Setup..." -ForegroundColor Cyan
Write-Host "   Run: node scripts/fl/testFLWorkflow.js" -ForegroundColor White
Write-Host ""

Write-Host "✨ Setup guide complete!" -ForegroundColor Green
Write-Host "   Follow the steps above to complete production deployment" -ForegroundColor White
