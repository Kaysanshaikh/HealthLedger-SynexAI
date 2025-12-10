# Production Deployment Guide - HealthLedger FL

## Prerequisites

Before deploying, ensure you have:
- [ ] New GitHub repository created
- [ ] Neon PostgreSQL database created
- [ ] Render account ready
- [ ] Polygon Amoy RPC endpoint (GetBlock.io or Alchemy)
- [ ] Pinata IPFS account with API keys
- [ ] MetaMask wallet with Amoy testnet MATIC

---

## Step 1: Disconnect from Current Git Repository

```bash
# Navigate to project directory
cd "c:\Users\Kaysan Shaikh\Desktop\Federated Learning\HealthLedger"

# Remove current git remote
git remote remove origin

# Or if you want to completely reinitialize
rm -rf .git
git init
```

---

## Step 2: Push to New Repository

```bash
# Initialize git (if removed)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: HealthLedger Federated Learning System"

# Add new remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/healthledger-fl.git

# Push to new repository
git branch -M main
git push -u origin main
```

---

## Step 3: Setup Neon PostgreSQL Database

### 3.1 Create Database on Neon

1. Go to https://neon.tech
2. Create new project: "HealthLedger-FL-Production"
3. Copy the connection string

### 3.2 Initialize Database Schema

```bash
# Connect to Neon database
psql "YOUR_NEON_CONNECTION_STRING"

# Run the initialization script
\i database/init_fl_local.sql

# Verify tables created
\dt

# Exit
\q
```

**Alternative**: Use the provided Node.js script:
```bash
node database/initNeonDB.js
```

---

## Step 4: Configure Environment Variables

### 4.1 Create Production `.env` File

Copy `.env.production.example` to `.env`:

```bash
cp .env.production.example .env
```

### 4.2 Fill in Production Values

Edit `.env` with your production credentials:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/healthledger_fl?sslmode=require

# Blockchain (Polygon Amoy Testnet)
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
CONTRACT_ADDRESS=  # Will be filled after deployment
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# JWT Secret (generate random string)
JWT_SECRET=your_secure_random_jwt_secret_min_32_chars

# Server
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.onrender.com

# FL Configuration
FL_ENABLED=true
FL_MIN_PARTICIPANTS=2
FL_ROUND_TIMEOUT=3600
```

---

## Step 5: Deploy Smart Contract to Polygon Amoy

### 5.1 Get Testnet MATIC

1. Visit: https://faucet.polygon.technology/
2. Select "Polygon Amoy"
3. Enter your wallet address
4. Request testnet MATIC

### 5.2 Deploy Contract

```bash
# Compile contracts
npx hardhat compile

# Deploy to Polygon Amoy
npx hardhat run scripts/deployFL.js --network polygonAmoy

# Copy the contract address from output
# Update .env with CONTRACT_ADDRESS
```

### 5.3 Verify Contract (Optional)

```bash
npx hardhat verify --network polygonAmoy YOUR_CONTRACT_ADDRESS "YOUR_ADMIN_ADDRESS"
```

---

## Step 6: Deploy to Render

### 6.1 Create New Web Service

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `healthledger-fl-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx hardhat compile`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for production)

### 6.2 Add Environment Variables

In Render dashboard, add all variables from your `.env` file:

```
DATABASE_URL=...
PRIVATE_KEY=...
CONTRACT_ADDRESS=...
POLYGON_AMOY_RPC=...
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
JWT_SECRET=...
NODE_ENV=production
FL_ENABLED=true
```

### 6.3 Deploy

Click "Create Web Service" - Render will automatically deploy.

---

## Step 7: Initialize Production Database

### 7.1 Run Migrations

After Render deployment is live, run migrations:

```bash
# Using Render Shell
# Go to Render dashboard → Your service → Shell

node database/initNeonDB.js
```

### 7.2 Verify Database

```bash
# Check tables exist
node database/viewData.js
```

---

## Step 8: Register Initial FL Participants

### 8.1 Using API

```bash
# Replace with your Render URL
export API_URL=https://healthledger-fl-api.onrender.com

# Register participants
curl -X POST $API_URL/api/fl/participants/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "institutionName": "City General Hospital"
  }'
```

### 8.2 Using Hardhat Script

```bash
npx hardhat run scripts/fl/registerParticipants.js --network polygonAmoy
```

---

## Step 9: Test Production Deployment

### 9.1 Health Check

```bash
curl https://healthledger-fl-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": 1234567890
}
```

### 9.2 Create Test FL Model

```bash
curl -X POST https://healthledger-fl-api.onrender.com/api/fl/models \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "diabetes",
    "modelType": "logistic_regression"
  }'
```

### 9.3 Run End-to-End Test

```bash
# Update .env to point to production
NODE_ENV=production node scripts/fl/testFLWorkflow.js
```

---

## Step 10: Monitor and Maintain

### 10.1 Check Logs

```bash
# Render Dashboard → Logs
# Monitor for errors and performance
```

### 10.2 Database Monitoring

```bash
# Neon Dashboard → Metrics
# Monitor connections, queries, storage
```

### 10.3 Blockchain Monitoring

- View transactions: https://www.oklink.com/amoy
- Check contract: https://www.oklink.com/amoy/address/YOUR_CONTRACT_ADDRESS

---

## Troubleshooting

### Issue: Contract deployment fails

**Solution**:
```bash
# Check wallet balance
npx hardhat console --network polygonAmoy
> await ethers.provider.getBalance("YOUR_ADDRESS")

# Get more testnet MATIC from faucet
```

### Issue: Database connection fails

**Solution**:
```bash
# Verify connection string format
# Ensure ?sslmode=require is included
# Check Neon dashboard for database status
```

### Issue: IPFS upload fails

**Solution**:
```bash
# Test Pinata credentials
node scripts/testPinata.js

# Check Pinata dashboard for API limits
```

### Issue: Render deployment fails

**Solution**:
```bash
# Check build logs in Render dashboard
# Ensure all dependencies in package.json
# Verify Node.js version compatibility
```

---

## Production Checklist

- [ ] Git repository disconnected and pushed to new repo
- [ ] Neon database created and initialized
- [ ] Smart contract deployed to Polygon Amoy
- [ ] Contract address updated in .env
- [ ] Render web service created
- [ ] Environment variables configured in Render
- [ ] Database migrations run successfully
- [ ] Initial participants registered
- [ ] Health check endpoint working
- [ ] Test FL model created successfully
- [ ] Logs monitoring setup
- [ ] Backup strategy defined

---

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to git
- Keep private keys secure
- Use environment variables in Render
- Enable SSL/TLS for all connections
- Regularly rotate JWT secrets
- Monitor for suspicious activity
- Set up rate limiting on API endpoints

---

## Next Steps After Deployment

1. **Build Frontend Dashboard**
   - React app with FL metrics visualization
   - Deploy to Render Static Site or Vercel

2. **Implement Real ML Models**
   - Setup Python ML backend
   - Train actual disease prediction models
   - Integrate with TensorFlow/PyTorch

3. **Setup Monitoring**
   - Add Sentry for error tracking
   - Setup uptime monitoring
   - Configure alerts

4. **Documentation**
   - API documentation (Swagger/OpenAPI)
   - User guides for hospitals
   - Developer documentation

---

## Support

For issues or questions:
- Check logs in Render dashboard
- Review Neon database metrics
- Verify blockchain transactions on Amoy explorer
- Test API endpoints with Postman

---

**Deployment Status**: Ready for Production ✅
