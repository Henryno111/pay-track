import React, { useState, useEffect } from 'react';
import { userSession, connectWallet, disconnectWallet, getUserAddress } from './utils/stacksConnection';
import { initializeWalletConnect } from './utils/walletconnect';
import PaymentForm from './components/PaymentForm';
import EscrowForm from './components/EscrowForm';
import Dashboard from './components/Dashboard';
import StacksPayLogo from './components/StacksPayLogo';

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
            <StacksPayLogo className="h-12" />
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
