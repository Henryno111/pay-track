# Pay-Track: Decentralized Payment & Escrow Platform

A blockchain-based fintech solution built on Stacks with smart contracts for payments and escrow services, integrated with WalletConnect for seamless user experience.

## 🚀 Features

### Smart Contracts
- **User Registry**: User registration and KYC verification system
- **Payment Processor**: Instant peer-to-peer payments with 2% platform fee
- **Escrow Service**: Secure escrow transactions with dispute resolution (3% fee)

### Frontend
- **React.js** web application with Tailwind CSS
- **WalletConnect** integration for easy wallet connectivity
- **Stacks.js** for blockchain interactions
- Real-time transaction monitoring and dashboard

## 📁 Project Structure

```
pay-track/
├── pay-track/                  # Main Clarinet project
│   ├── contracts/              # Smart contracts
│   │   ├── user-registry.clar
│   │   ├── payment-processor.clar
│   │   └── escrow-service.clar
│   ├── tests/                  # Contract tests
│   │   ├── user-registry.test.ts
│   │   ├── payment-processor.test.ts
│   │   └── escrow-service.test.ts
│   ├── deployments/            # Deployment configurations
│   └── Clarinet.toml           # Clarinet configuration
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── utils/              # Blockchain utilities
│   │   ├── App.jsx             # Main app component
│   │   └── index.js            # App entry point
│   ├── public/
│   └── package.json
├── DEPLOYMENT.md               # Deployment guide
└── README.md                   # This file
```

## 🛠️ Technology Stack

- **Blockchain**: Stacks (Clarity smart contracts)
- **Frontend**: React.js, Tailwind CSS
- **Wallet Integration**: WalletConnect, Stacks Connect
- **Testing**: Vitest, Clarinet SDK
- **Development**: Clarinet CLI

## 🏁 Getting Started

### Prerequisites

- Node.js v18+
- Clarinet CLI
- Stacks wallet (Hiro Wallet or Leather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pay-track
   ```

2. **Install Clarinet dependencies**
   ```bash
   cd pay-track
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Testing

Run all contract tests:
```bash
cd pay-track
npm test
```

Output:
```
✓ tests/escrow-service.test.ts (8 tests)
✓ tests/user-registry.test.ts (6 tests)
✓ tests/payment-processor.test.ts (5 tests)

Test Files  3 passed (3)
Tests  19 passed (19)
```

### Local Development

1. **Start Clarinet console (optional)**
   ```bash
   cd pay-track
   clarinet console
   ```

2. **Start frontend development server**
   ```bash
   cd frontend
   npm start
   ```

   The app will open at `http://localhost:3000`

## 📝 Smart Contract Details

### User Registry Contract

**Functions:**
- `register-user(username)`: Register a new user
- `verify-kyc(user)`: Verify user KYC (admin only)
- `get-user(user)`: Read user details
- `get-total-users()`: Get total registered users

**Error Codes:**
- `u100`: User already registered
- `u101`: Username required
- `u102`: User not found
- `u103`: Only owner can verify

### Payment Processor Contract

**Functions:**
- `send-payment(recipient, amount, memo)`: Send payment with 2% fee
- `get-payment(payment-id)`: Get payment details
- `get-total-fees()`: Get total fees collected

**Error Codes:**
- `u200`: Amount must be positive
- `u201`: Cannot send to self
- `u202`: Net amount must be positive

### Escrow Service Contract

**Functions:**
- `create-escrow(seller, amount, duration, description)`: Create new escrow
- `release-escrow(escrow-id)`: Release funds to seller
- `refund-escrow(escrow-id)`: Refund buyer after expiry
- `get-escrow(escrow-id)`: Get escrow details

**Error Codes:**
- `u300`: Amount must be positive
- `u301`: Buyer cannot be seller
- `u302`: Duration must be positive
- `u303`: Escrow not found
- `u304`: Only buyer can release
- `u305`: Must be active
- `u306`: Unauthorized
- `u307`: Must be expired

## 🚀 Deployment

### Mainnet Deployment

1. **Configure mainnet settings**
   ```bash
   # Edit settings/Mainnet.toml
   # Add your mnemonic phrase
   ```

2. **Generate deployment plan**
   ```bash
   cd pay-track
   clarinet deployments generate --mainnet --medium-cost
   ```

3. **Deploy contracts**
   ```bash
   clarinet deployments apply --mainnet
   ```

4. **Update frontend configuration**
   ```bash
   # Create frontend/.env
   REACT_APP_NETWORK=mainnet
   REACT_APP_CONTRACT_ADDRESS=<your-deployed-address>
   REACT_APP_WALLETCONNECT_PROJECT_ID=<your-project-id>
   ```

5. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Testing Guide

### Running Tests

```bash
cd pay-track
npm test
```

### Test Coverage

- **User Registry**: 6 test cases
  - Registration validation
  - Duplicate prevention
  - KYC verification
  - Authorization checks

- **Payment Processor**: 5 test cases
  - Payment processing
  - Fee calculation
  - Validation rules
  - Payment history

- **Escrow Service**: 8 test cases
  - Escrow creation
  - Release mechanism
  - Refund after expiry
  - Authorization controls

## 🔐 Security Considerations

1. **Contract Security**
   - All inputs validated
   - Authorization checks implemented
   - Proper error handling

2. **Frontend Security**
   - Environment variables for sensitive data
   - Never commit private keys
   - WalletConnect for secure transactions

3. **Best Practices**
   - Test thoroughly before mainnet deployment
   - Start with small amounts
   - Monitor transactions
   - Have contracts audited for production

## 📚 Resources

- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [Clarinet Documentation](https://docs.hiro.so/stacks/clarinet)
- [WalletConnect Docs](https://docs.walletconnect.network)
- [Stacks.js Documentation](https://github.com/hirosystems/stacks.js)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues**: Open a GitHub issue
- **Discord**: [Stacks Discord](https://discord.gg/stacks)
- **Forum**: [Stacks Forum](https://forum.stacks.org)

## ✅ Project Status

- [x] Smart contracts implemented
- [x] Comprehensive test suite
- [x] Frontend components
- [x] WalletConnect integration
- [x] Deployment configuration
- [ ] Mainnet deployment (ready)
- [ ] Production monitoring
- [ ] Security audit (recommended)

---

Built with ❤️ on Stacks Blockchain
