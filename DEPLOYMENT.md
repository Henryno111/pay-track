# Pay-Track Deployment Guide

## Deployment Overview

This guide covers deploying the Pay-Track smart contracts to Stacks Mainnet.

### Prerequisites

1. **Stacks Wallet with STX**
   - You need a Stacks wallet with sufficient STX for deployment fees
   - Estimated cost: ~2.2 STX (728609 + 728369 + 728309 = 2,185,287 microstacks)

2. **Clarinet CLI**
   - Already installed at `/usr/local/bin/clarinet`

3. **Private Key/Mnemonic**
   - You'll need your mainnet wallet mnemonic phrase

## Deployment Steps

### Step 1: Configure Mainnet Settings

Edit `settings/Mainnet.toml` and add your mnemonic:

```toml
[accounts.deployer]
mnemonic = "your twelve or twenty four word mnemonic phrase here"
```

**⚠️ SECURITY WARNING**: Never commit this file to version control!

### Step 2: Review Deployment Plan

The deployment plan is in `deployments/default.mainnet-plan.yaml`:
- 3 contracts will be deployed in one batch
- Deployer address: SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979
- Total cost: ~2.2 STX

### Step 3: Deploy to Mainnet

```bash
cd pay-track
clarinet deployments apply --mainnet
```

This will:
1. Validate your contracts
2. Submit transactions to Stacks mainnet
3. Wait for confirmation
4. Display deployed contract addresses

### Step 4: Save Deployment Information

After deployment, save the contract addresses:
- user-registry: SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979.user-registry
- payment-processor: SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979.payment-processor
- escrow-service: SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979.escrow-service

### Step 5: Update Frontend Configuration

Update the frontend to use mainnet:

1. Edit `frontend/src/utils/stacksConnection.js`:
   ```javascript
   // Change from StacksTestnet to StacksMainnet
   import { StacksMainnet } from "@stacks/network";
   const network = new StacksMainnet();
   ```

2. Update contract addresses:
   ```javascript
   const CONTRACT_ADDRESS = "SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979";
   ```

3. Update `.env` file:
   ```env
   REACT_APP_NETWORK=mainnet
   REACT_APP_CONTRACT_ADDRESS=SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979
   REACT_APP_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```

## Verification

After deployment, verify contracts at:
- Stacks Explorer: https://explorer.hiro.so/
- Search for your deployer address

## Test Deployment (Recommended First)

Before mainnet, test on devnet:

```bash
# Start local devnet
clarinet integrate

# In another terminal, deploy to devnet
clarinet deployments apply --devnet
```

## Troubleshooting

### Insufficient Funds
- Ensure deployer wallet has >2.5 STX
- Check balance: `clarinet deployments check --mainnet`

### Transaction Failed
- Check network status: https://status.hiro.so/
- Review transaction in explorer
- Verify contract syntax: `clarinet check`

### Contract Already Exists
- Each contract name must be unique per account
- Change contract names in Clarinet.toml if needed

## Post-Deployment Checklist

- [ ] Contracts deployed successfully
- [ ] Contract addresses saved
- [ ] Frontend updated with mainnet addresses
- [ ] WalletConnect configured
- [ ] Test all contract functions on mainnet
- [ ] Monitor initial transactions
- [ ] Set up contract analytics/monitoring

## Support

- Stacks Discord: https://discord.gg/stacks
- Clarinet Docs: https://docs.hiro.so/stacks/clarinet
- Stacks Forum: https://forum.stacks.org/
