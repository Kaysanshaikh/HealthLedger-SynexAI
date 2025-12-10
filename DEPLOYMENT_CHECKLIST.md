# Production Deployment Checklist

Use this checklist to ensure proper deployment to production.

## Pre-Deployment

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Dependencies updated to stable versions
- [ ] Security audit completed
- [ ] Documentation updated

## Repository Setup

- [ ] Current git remote removed
- [ ] New repository created on GitHub
- [ ] Code pushed to new repository
- [ ] Repository set to private (recommended)
- [ ] README.md updated with new repo URL

## Database Setup

- [ ] Neon PostgreSQL account created
- [ ] New database project created
- [ ] Connection string copied
- [ ] Database initialized with `initNeonDB.js`
- [ ] Tables verified
- [ ] Sample data inserted

## Blockchain Setup

- [ ] Wallet funded with Amoy testnet MATIC
- [ ] Polygon Amoy RPC endpoint configured
- [ ] Smart contract compiled
- [ ] Contract deployed to Polygon Amoy
- [ ] Contract address saved
- [ ] Contract verified on explorer (optional)

## Environment Configuration

- [ ] `.env` file created from template
- [ ] `DATABASE_URL` configured
- [ ] `PRIVATE_KEY` added (NEVER commit!)
- [ ] `CONTRACT_ADDRESS` updated
- [ ] `POLYGON_AMOY_RPC` configured
- [ ] `PINATA_API_KEY` added
- [ ] `PINATA_SECRET_KEY` added
- [ ] `JWT_SECRET` generated (32+ chars)
- [ ] `FRONTEND_URL` configured

## Render Deployment

- [ ] Render account created
- [ ] New web service created
- [ ] GitHub repository connected
- [ ] Build command configured
- [ ] Start command configured
- [ ] All environment variables added
- [ ] First deployment successful
- [ ] Health check endpoint working

## Post-Deployment

- [ ] FL participants registered
- [ ] Test FL model created
- [ ] End-to-end test completed
- [ ] API endpoints tested
- [ ] Logs monitored
- [ ] Error tracking setup (Sentry)
- [ ] Uptime monitoring configured

## Security

- [ ] `.env` file NOT committed
- [ ] Private keys secured
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection prevention verified

## Monitoring

- [ ] Render logs accessible
- [ ] Neon database metrics reviewed
- [ ] Blockchain transactions monitored
- [ ] Error alerts configured
- [ ] Performance metrics tracked

## Documentation

- [ ] API documentation complete
- [ ] Deployment guide updated
- [ ] User guides written
- [ ] Developer docs updated
- [ ] Troubleshooting guide created

## Final Verification

- [ ] All API endpoints working
- [ ] Database queries optimized
- [ ] Smart contract functions tested
- [ ] IPFS uploads working
- [ ] ZK proofs generating
- [ ] FedAvg aggregation working
- [ ] Byzantine detection active

## Backup & Recovery

- [ ] Database backup strategy defined
- [ ] Contract source code backed up
- [ ] Environment variables documented
- [ ] Recovery procedures documented

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Production URL**: _____________

**Contract Address**: _____________

**Database**: _____________

---

## Notes

_Add any deployment-specific notes here_
