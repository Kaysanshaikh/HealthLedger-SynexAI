# 📖 SynexAI Master Guide

This comprehensive guide covers everything from local development setup to production deployment and architectural deep-dives.

---

## 📋 Table of Contents
1. [Local Development Setup](#1-local-development-setup)
2. [Testing Procedures](#2-testing-procedures)
3. [System Architecture](#3-system-architecture)
4. [Database Quick Reference](#4-database-quick-reference)
5. [IPFS & Pinata Integration](#5-ipfs--pinata-integration)
6. [Production Deployment Guide](#6-production-deployment-guide)
7. [Deployment Checklist](#7-checklist)
8. [Troubleshooting & Common Issues](#8-troubleshooting--common-issues)

---

## 1. Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (Neon recommended)
- MetaMask wallet
- Polygon Amoy testnet MATIC

### Installation
1. **Zero-Step Install**:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Blockchain Node**:
   In a separate terminal, start the local Hardhat node:
   ```bash
   npx hardhat node
   ```

3. **Deploy Contracts**:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

4. **Start Servers**:
   ```bash
   # Terminal 1: API
   npm run dev:api
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

---

## 2. Testing Procedures

### Quick Tests
- **Database**: `npm run db:test`
- **IPFS**: `node scripts/testPinata.js`
- **API Health**: `curl http://localhost:5001/api/health`

### End-to-End Workflow
1. Register a Patient at `/patient_registration`.
2. Register a Doctor at `/doctor_registration`.
3. Login as Patient and grant access to the Doctor via "Manage Access".
4. Upload a medical record and verify it appears on the blockchain explorer.

---

## 3. System Architecture

SynexAI uses a **hybrid architecture** for maximum security and performance:

- **Blockchain (Polygon)**: The immutable Source of Truth. Stores user profiles, access permissions, and IPFS CIDs (pointers).
- **Database (PostgreSQL)**: The high-speed Query Cache. Indexes blockchain data for fast searches and notifications.
- **IPFS (Pinata)**: Distributed storage for encrypted medical files (PDFs, images).

### Data Flow
1. User uploads a file.
2. File is encrypted and sent to **IPFS**.
3. The **IPFS CID** and metadata are recorded on the **Blockchain**.
4. The transaction is indexed in the **Database** for fast retrieval.

---

## 4. Database Quick Reference

### Common Snippets
```javascript
// Indexing a blockchain record in the DB cache
await db.indexRecord({
  recordId: "record-123",
  patientWallet: "0x...",
  ipfsCid: "Qm...",
  recordType: "diagnostic",
  metadata: { testName: "Blood Test" }
});

// Logging access for compliance (Audit Trail)
await db.logAccess(recordId, accessorWallet, 'doctor', 'view');
```

---

## 5. IPFS & Pinata Integration

### Configuration
Ensure your `.env` contains:
- `PINATA_API_KEY`
- `PINATA_SECRET_KEY`

### Supported Files
- **Documents**: PDF, DOC, DOCX
- **Images**: JPG, PNG
- **Size Limit**: 1MB (Production default)

---

## 6. Production Deployment Guide

### Neon (Database)
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string (ensure `?sslmode=require` is present).
3. Initialize tables: `node database/initNeonDB.js`.

### Render (API & Frontend)
1. **API Service**:
   - Runtime: Node
   - Build: `npm install && npx hardhat compile`
   - Start: `npm start`
2. **Frontend Service**:
   - Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Start: `npm start` (serves the `build` folder)

---

## 7. Checklist

- [ ] Private Key NOT committed to Git.
- [ ] `NODE_ENV` set to `production`.
- [ ] `FRONTEND_URL` updated in API environment variables.
- [ ] Database initialized on clinical nodes.
- [ ] Smart contract address verified on PolygonScan.

---

## 8. Troubleshooting & Common Issues

- **"Failed to connect to MetaMask"**: Ensure you are on the correct network (Hardhat Local or Polygon Amoy).
- **"Database connection timeout"**: Verify your IP isn't blocked and `sslmode=require` is in your connection string.
- **"IPFS Upload Error"**: Check your Pinata quota and API key permissions.

---

**Last Updated**: January 2026
**Version**: 3.0.0 (Unified Guide)
