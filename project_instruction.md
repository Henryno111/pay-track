# WalletConnect Integration Guide for Stacks Clarity Smart Contracts

## Project Overview

This guide covers building a fintech/blockchain solution on Stacks with 3 Clarity smart contracts, a frontend interface, and WalletConnect integration for seamless user transactions.

---

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Smart Contracts Design](#smart-contracts-design)
3. [WalletConnect Setup](#walletconnect-setup)
4. [Frontend Implementation](#frontend-implementation)
5. [Transaction Flow](#transaction-flow)
6. [Testing & Deployment](#testing--deployment)

---

## Project Architecture

### Tech Stack
- **Smart Contracts**: Clarity (Stacks blockchain)
- **Frontend**: React.js
- **Wallet Integration**: WalletConnect + Stacks.js
- **State Management**: React hooks
- **Styling**: Tailwind CSS

### Project Structure
```
stacks-fintech-app/
├── contracts/
│   ├── payment-processor.clar
│   ├── escrow-service.clar
│   └── user-registry.clar
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
└── tests/
```

---

## Smart Contracts Design

### 1. User Registry Contract (`user-registry.clar`)

Manages user registration and profiles.

```clarity
;; User Registry Contract
;; Manages user profiles and KYC status

(define-map users 
  { user-address: principal }
  {
    username: (string-ascii 50),
    registration-block: uint,
    kyc-verified: bool,
    reputation-score: uint
  }
)

(define-data-var total-users uint u0)

;; Register new user
(define-public (register-user (username (string-ascii 50)))
  (let
    (
      (caller tx-sender)
      (user-exists (map-get? users { user-address: caller }))
    )
    (asserts! (is-none user-exists) (err u100)) ;; User already registered
    (asserts! (> (len username) u0) (err u101)) ;; Username required
    
    (map-set users
      { user-address: caller }
      {
        username: username,
        registration-block: block-height,
        kyc-verified: false,
        reputation-score: u100
      }
    )
    
    (var-set total-users (+ (var-get total-users) u1))
    (ok true)
  )
)

;; Update KYC status (admin only)
(define-public (verify-kyc (user principal))
  (let
    (
      (user-data (unwrap! (map-get? users { user-address: user }) (err u102)))
    )
    (asserts! (is-eq tx-sender contract-owner) (err u103)) ;; Only owner can verify
    
    (map-set users
      { user-address: user }
      (merge user-data { kyc-verified: true })
    )
    (ok true)
  )
)

;; Get user details
(define-read-only (get-user (user principal))
  (map-get? users { user-address: user })
)

;; Get total users
(define-read-only (get-total-users)
  (ok (var-get total-users))
)

(define-constant contract-owner tx-sender)
```

### 2. Payment Processor Contract (`payment-processor.clar`)

Handles peer-to-peer payments with fee collection.

```clarity
;; Payment Processor Contract
;; Processes instant payments with platform fees

(define-constant contract-owner tx-sender)
(define-constant platform-fee-percentage u2) ;; 2% platform fee

(define-map payment-history
  { payment-id: uint }
  {
    sender: principal,
    recipient: principal,
    amount: uint,
    fee: uint,
    timestamp: uint,
    status: (string-ascii 20)
  }
)

(define-data-var payment-counter uint u0)
(define-data-var total-fees-collected uint u0)

;; Process payment
(define-public (send-payment (recipient principal) (amount uint) (memo (string-utf8 256)))
  (let
    (
      (fee (/ (* amount platform-fee-percentage) u100))
      (net-amount (- amount fee))
      (payment-id (+ (var-get payment-counter) u1))
    )
    ;; Validations
    (asserts! (> amount u0) (err u200)) ;; Amount must be positive
    (asserts! (not (is-eq tx-sender recipient)) (err u201)) ;; Cannot send to self
    (asserts! (> net-amount u0) (err u202)) ;; Net amount must be positive
    
    ;; Transfer tokens
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (try! (as-contract (stx-transfer? net-amount tx-sender recipient)))
    
    ;; Record payment
    (map-set payment-history
      { payment-id: payment-id }
      {
        sender: tx-sender,
        recipient: recipient,
        amount: amount,
        fee: fee,
        timestamp: block-height,
        status: "completed"
      }
    )
    
    ;; Update counters
    (var-set payment-counter payment-id)
    (var-set total-fees-collected (+ (var-get total-fees-collected) fee))
    
    (ok payment-id)
  )
)

;; Get payment details
(define-read-only (get-payment (payment-id uint))
  (map-get? payment-history { payment-id: payment-id })
)

;; Get total fees collected
(define-read-only (get-total-fees)
  (ok (var-get total-fees-collected))
)

;; Get user payment count
(define-read-only (get-user-payment-count (user principal))
  (ok u0) ;; Simplified - in production, maintain a counter
)
```

### 3. Escrow Service Contract (`escrow-service.clar`)

Manages secure escrow transactions with dispute resolution.

```clarity
;; Escrow Service Contract
;; Provides secure escrow for transactions with dispute resolution

(define-constant contract-owner tx-sender)
(define-constant escrow-fee-percentage u3) ;; 3% escrow fee

(define-map escrows
  { escrow-id: uint }
  {
    buyer: principal,
    seller: principal,
    amount: uint,
    fee: uint,
    created-at: uint,
    expires-at: uint,
    status: (string-ascii 20),
    description: (string-utf8 256)
  }
)

(define-data-var escrow-counter uint u0)

;; Create escrow
(define-public (create-escrow 
    (seller principal) 
    (amount uint) 
    (duration uint)
    (description (string-utf8 256))
  )
  (let
    (
      (fee (/ (* amount escrow-fee-percentage) u100))
      (total-amount (+ amount fee))
      (escrow-id (+ (var-get escrow-counter) u1))
      (expiry (+ block-height duration))
    )
    ;; Validations
    (asserts! (> amount u0) (err u300)) ;; Amount must be positive
    (asserts! (not (is-eq tx-sender seller)) (err u301)) ;; Buyer cannot be seller
    (asserts! (> duration u0) (err u302)) ;; Duration must be positive
    
    ;; Lock funds in escrow
    (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))
    
    ;; Create escrow record
    (map-set escrows
      { escrow-id: escrow-id }
      {
        buyer: tx-sender,
        seller: seller,
        amount: amount,
        fee: fee,
        created-at: block-height,
        expires-at: expiry,
        status: "active",
        description: description
      }
    )
    
    (var-set escrow-counter escrow-id)
    (ok escrow-id)
  )
)

;; Release escrow to seller
(define-public (release-escrow (escrow-id uint))
  (let
    (
      (escrow-data (unwrap! (map-get? escrows { escrow-id: escrow-id }) (err u303)))
      (buyer (get buyer escrow-data))
      (seller (get seller escrow-data))
      (amount (get amount escrow-data))
      (status (get status escrow-data))
    )
    ;; Validations
    (asserts! (is-eq tx-sender buyer) (err u304)) ;; Only buyer can release
    (asserts! (is-eq status "active") (err u305)) ;; Must be active
    
    ;; Transfer to seller
    (try! (as-contract (stx-transfer? amount tx-sender seller)))
    
    ;; Update status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow-data { status: "released" })
    )
    
    (ok true)
  )
)

;; Refund escrow to buyer
(define-public (refund-escrow (escrow-id uint))
  (let
    (
      (escrow-data (unwrap! (map-get? escrows { escrow-id: escrow-id }) (err u303)))
      (buyer (get buyer escrow-data))
      (seller (get seller escrow-data))
      (amount (get amount escrow-data))
      (fee (get fee escrow-data))
      (expires-at (get expires-at escrow-data))
      (status (get status escrow-data))
    )
    ;; Validations
    (asserts! (or (is-eq tx-sender buyer) (is-eq tx-sender seller)) (err u306))
    (asserts! (is-eq status "active") (err u305))
    (asserts! (>= block-height expires-at) (err u307)) ;; Must be expired
    
    ;; Refund buyer
    (try! (as-contract (stx-transfer? (+ amount fee) tx-sender buyer)))
    
    ;; Update status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow-data { status: "refunded" })
    )
    
    (ok true)
  )
)

;; Get escrow details
(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows { escrow-id: escrow-id })
)
```

---

## WalletConnect Setup

### Step 1: Install Dependencies

```bash
npm install @walletconnect/core @reown/walletkit @stacks/connect @stacks/transactions
```

### Step 2: Create WalletConnect Configuration

Create `frontend/src/utils/walletconnect.js`:

```javascript
import { Core } from "@walletconnect/core";
import { WalletKit } from "@reown/walletkit";

// Initialize WalletConnect Core
const core = new Core({
  projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
});

// Initialize WalletKit
let walletKit;

export const initializeWalletConnect = async () => {
  if (!walletKit) {
    walletKit = await WalletKit.init({
      core,
      metadata: {
        name: "Stacks Fintech App",
        description: "Decentralized payment and escrow platform on Stacks",
        url: "https://your-app-url.com",
        icons: ["https://your-app-url.com/icon.png"],
      },
    });

    // Set up event listeners
    setupEventListeners();
  }
  
  return walletKit;
};

// Handle session proposals
const setupEventListeners = () => {
  walletKit.on("session_proposal", async (proposal) => {
    console.log("Session proposal received:", proposal);
    // Handle proposal in your UI
  });

  walletKit.on("session_request", async (event) => {
    console.log("Session request received:", event);
    // Handle transaction requests
  });

  walletKit.on("session_delete", () => {
    console.log("Session deleted");
    // Clean up session state
  });
};

export const getWalletKit = () => walletKit;

export { walletKit };
```

### Step 3: Create Stacks Connection Utility

Create `frontend/src/utils/stacksConnection.js`:

```javascript
import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { 
  makeContractCall, 
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringUtf8CV,
  uintCV,
  principalCV
} from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network";

const appConfig = new AppConfig(["store_write", "publish_data"]);
export const userSession = new UserSession({ appConfig });

// Network configuration
const network = new StacksTestnet(); // Change to StacksMainnet for production

// Connect wallet
export const connectWallet = () => {
  showConnect({
    appDetails: {
      name: "Stacks Fintech App",
      icon: window.location.origin + "/logo.png",
    },
    redirectTo: "/",
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
};

// Disconnect wallet
export const disconnectWallet = () => {
  userSession.signUserOut("/");
};

// Get user address
export const getUserAddress = () => {
  if (userSession.isUserSignedIn()) {
    const userData = userSession.loadUserData();
    return userData.profile.stxAddress.testnet; // Use .mainnet for production
  }
  return null;
};

// Register user
export const registerUser = async (username) => {
  const txOptions = {
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Replace with your deployed contract
    contractName: "user-registry",
    functionName: "register-user",
    functionArgs: [stringUtf8CV(username)],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network);
};

// Send payment
export const sendPayment = async (recipient, amount, memo) => {
  const txOptions = {
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Replace
    contractName: "payment-processor",
    functionName: "send-payment",
    functionArgs: [
      principalCV(recipient),
      uintCV(amount),
      stringUtf8CV(memo)
    ],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network);
};

// Create escrow
export const createEscrow = async (seller, amount, duration, description) => {
  const txOptions = {
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Replace
    contractName: "escrow-service",
    functionName: "create-escrow",
    functionArgs: [
      principalCV(seller),
      uintCV(amount),
      uintCV(duration),
      stringUtf8CV(description)
    ],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network);
};

// Release escrow
export const releaseEscrow = async (escrowId) => {
  const txOptions = {
    contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Replace
    contractName: "escrow-service",
    functionName: "release-escrow",
    functionArgs: [uintCV(escrowId)],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  const transaction = await makeContractCall(txOptions);
  return broadcastTransaction(transaction, network);
};
```

---

## Frontend Implementation

### Step 1: Create Main App Component

Create `frontend/src/App.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { userSession, connectWallet, disconnectWallet, getUserAddress } from './utils/stacksConnection';
import { initializeWalletConnect } from './utils/walletconnect';
import PaymentForm from './components/PaymentForm';
import EscrowForm from './components/EscrowForm';
import Dashboard from './components/Dashboard';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('payment');

  useEffect(() => {
    // Initialize WalletConnect
    initializeWalletConnect();

    // Check if user is signed in
    if (userSession.isUserSignedIn()) {
      setIsConnected(true);
      setUserAddress(getUserAddress());
    }
  }, []);

  const handleConnect = () => {
    connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsConnected(false);
    setUserAddress(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Stacks Fintech Platform
            </h1>
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {userAddress?.slice(0, 8)}...{userAddress?.slice(-6)}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!isConnected ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Welcome to Stacks Fintech Platform
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your wallet to start making secure payments and using escrow services
            </p>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'payment'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Send Payment
                </button>
                <button
                  onClick={() => setActiveTab('escrow')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'escrow'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create Escrow
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'dashboard'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
              {activeTab === 'payment' && <PaymentForm userAddress={userAddress} />}
              {activeTab === 'escrow' && <EscrowForm userAddress={userAddress} />}
              {activeTab === 'dashboard' && <Dashboard userAddress={userAddress} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
```

### Step 2: Create Payment Form Component

Create `frontend/src/components/PaymentForm.jsx`:

```jsx
import React, { useState } from 'react';
import { sendPayment } from '../utils/stacksConnection';

function PaymentForm({ userAddress }) {
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    memo: ''
  });
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTxId(null);

    try {
      // Convert amount to microSTX (1 STX = 1,000,000 microSTX)
      const amountInMicroStx = parseInt(formData.amount) * 1000000;
      
      const result = await sendPayment(
        formData.recipient,
        amountInMicroStx,
        formData.memo
      );
      
      setTxId(result.txid);
      setFormData({ recipient: '', amount: '', memo: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Send Payment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            name="recipient"
            value={formData.recipient}
            onChange={handleChange}
            placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (STX)
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="10"
            step="0.000001"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            2% platform fee will be deducted
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Memo (Optional)
          </label>
          <textarea
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            placeholder="Payment for services"
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Send Payment'}
        </button>
      </form>

      {txId && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">Payment sent successfully!</p>
          <p className="text-sm text-green-600 mt-2 break-all">
            Transaction ID: {txId}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

export default PaymentForm;
```

### Step 3: Create Escrow Form Component

Create `frontend/src/components/EscrowForm.jsx`:

```jsx
import React, { useState } from 'react';
import { createEscrow } from '../utils/stacksConnection';

function EscrowForm({ userAddress }) {
  const [formData, setFormData] = useState({
    seller: '',
    amount: '',
    duration: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTxId(null);

    try {
      const amountInMicroStx = parseInt(formData.amount) * 1000000;
      const durationInBlocks = parseInt(formData.duration);
      
      const result = await createEscrow(
        formData.seller,
        amountInMicroStx,
        durationInBlocks,
        formData.description
      );
      
      setTxId(result.txid);
      setFormData({ seller: '', amount: '', duration: '', description: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Create Escrow</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seller Address
          </label>
          <input
            type="text"
            name="seller"
            value={formData.seller}
            onChange={handleChange}
            placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (STX)
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="100"
            step="0.000001"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            3% escrow fee will be charged
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (blocks)
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="1000"
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            ~10 minutes per block (~7 days = 1000 blocks)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the transaction..."
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-400"
        >
          {loading ? 'Creating Escrow...' : 'Create Escrow'}

          <parameter name="command">update</parameter>
<parameter name="id">walletconnect-stacks-guide</parameter>
<parameter name="old_str">        <button
       type="submit"
       disabled={loading}
       className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-400"
     >
{loading ? 'Creating Escrow...' : 'Create Escrow'}
</button></parameter>
<parameter name="new_str">        <button
       type="submit"
       disabled={loading}
       className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-400"
     >
{loading ? 'Creating Escrow...' : 'Create Escrow'}
</button>
</form>
  {txId && (
    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p className="text-green-800 font-medium">Escrow created successfully!</p>
      <p className="text-sm text-green-600 mt-2 break-all">
        Transaction ID: {txId}
      </p>
    </div>
  )}

  {error && (
    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800">{error}</p>
    </div>
  )}
</div>
);
}
export default EscrowForm;

### Step 4: Create Dashboard Component

Create `frontend/src/components/Dashboard.jsx`:
```jsx
import React, { useState, useEffect } from 'react';
import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

function Dashboard({ userAddress }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const network = new StacksTestnet();

  useEffect(() => {
    loadUserData();
  }, [userAddress]);

  const loadUserData = async () => {
    try {
      // Call read-only function to get user data
      const result = await callReadOnlyFunction({
        contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        contractName: "user-registry",
        functionName: "get-user",
        functionArgs: [principalCV(userAddress)],
        network,
        senderAddress: userAddress,
      });

      const value = cvToValue(result);
      setUserData(value);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Account Status
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {userData ? 'Registered' : 'Not Registered'}
          </p>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            KYC Status
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {userData?.kyc_verified ? 'Verified' : 'Pending'}
          </p>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Reputation Score
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {userData?.reputation_score || 'N/A'}
          </p>
        </div>
      </div>

      {userData && (
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Account Details</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600">Username</dt>
              <dd className="font-medium">{userData.username}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Registration Block</dt>
              <dd className="font-medium">{userData.registration_block}</dd>
            </div>
          </dl>
        </div>
      )}

      {!userData && (
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            You haven't registered yet. Please register to access all features.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
```

---

## Transaction Flow

### 1. Payment Flow
1. User connects wallet via Stacks Connect
2. User fills payment form (recipient, amount, memo)
3. Frontend calls `send-payment` contract function
4. Contract validates inputs and calculates 2% fee
5. STX transferred to contract, then net amount to recipient
6. Transaction broadcasted and confirmed on-chain
7. UI displays transaction ID

### 2. Escrow Flow
1. Buyer creates escrow with seller address and terms
2. Contract locks funds (amount + 3% fee) in escrow
3. Seller delivers goods/services
4. Buyer releases escrow, funds sent to seller
5. Or: If expired, either party can trigger refund

### 3. WalletConnect Integration Points
- Session proposal handling for wallet connections
- Transaction request handling for contract calls
- Event emission for account/chain changes
- Session management for persistent connections

---

## Testing & Deployment

### Local Testing

1. **Install Clarinet** (Stacks smart contract development tool):
```bash
brew install clarinet
```

2. **Initialize project**:
```bash
clarinet new stacks-fintech
cd stacks-fintech
```

3. **Add contracts** to `contracts/` directory

4. **Create test file** `tests/contracts_test.ts`:
```typescript
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';

Clarinet.test({
  name: "User can register",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "User can send payment",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(1000000), 
         types.utf8("test payment")], sender.address)
    ]);
    
    block.receipts[0].result.expectOk();
  },
});
```

5. **Run tests**:
```bash
clarinet test
```

### Deployment

1. **Deploy to testnet**:
```bash
clarinet deploy --testnet
```

2. **Update contract addresses** in `stacksConnection.js`

3. **Configure environment variables**:
```env
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id
REACT_APP_NETWORK=testnet
REACT_APP_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```

4. **Build and deploy frontend**:
```bash
npm run build
# Deploy to Vercel, Netlify, or your preferred host
```

---

## Security Best Practices

1. **Input Validation**: Always validate amounts, addresses, and user inputs
2. **Access Control**: Implement proper authorization checks in contracts
3. **Fee Management**: Clearly communicate fees to users before transactions
4. **Error Handling**: Provide clear error messages and handle edge cases
5. **Session Security**: Properly manage WalletConnect sessions and cleanup
6. **Network Configuration**: Use appropriate network (testnet/mainnet)
7. **Rate Limiting**: Implement rate limiting for API calls
8. **Audit**: Have contracts audited before mainnet deployment

---

## Next Steps

1. Register your wallet on WalletConnect Explorer
2. Implement additional features (notifications, history, analytics)
3. Add social recovery mechanisms
4. Integrate with more DeFi protocols
5. Implement advanced escrow features (partial releases, disputes)
6. Add multi-signature support
7. Build mobile app version
8. Conduct security audit

---

## Resources

- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [WalletConnect Docs](https://docs.walletconnect.network)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [Stacks.js SDK](https://github.com/hirosystems/stacks.js)

---

## Support

For issues or questions:
- GitHub Issues: [your-repo]/issues
- Discord: [Stacks Discord](https://discord.gg/stacks)
- Twitter: [@StacksOrg](https://twitter.com/StacksOrg)</parameter>