import React, { useState } from 'react';

const MultiSigEscrow = ({ userAddress, isConnected }) => {
  const [sellerAddress, setSellerAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [requiredSigs, setRequiredSigs] = useState('2');
  const [escrows, setEscrows] = useState([]);
  const [showEscrows, setShowEscrows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!sellerAddress || !amount || !duration || parseFloat(amount) <= 0 || parseInt(duration) <= 0) {
      setMessage('Please fill all required fields with valid values');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const microAmount = Math.floor(parseFloat(amount) * 1000000);
      const blocks = parseInt(duration);
      const sigs = parseInt(requiredSigs);
      
      const { createMultiSigEscrow } = await import('../utils/stacksConnection');
      const result = await createMultiSigEscrow(sellerAddress, microAmount, blocks, sigs);
      
      setMessage(`✅ Multi-sig escrow created! ID: ${result}`);
      
      // Reset form
      setSellerAddress('');
      setAmount('');
      setDuration('');
      
    } catch (error) {
      console.error('Error creating escrow:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to create escrow'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignRelease = async (escrowId) => {
    setLoading(true);
    setMessage('');

    try {
      const { signEscrowRelease } = await import('../utils/stacksConnection');
      await signEscrowRelease(escrowId);
      
      setMessage(`✅ Signed release for escrow #${escrowId}`);
      
    } catch (error) {
      console.error('Error signing release:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to sign'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignRefund = async (escrowId) => {
    setLoading(true);
    setMessage('');

    try {
      const { signEscrowRefund } = await import('../utils/stacksConnection');
      await signEscrowRefund(escrowId);
      
      setMessage(`✅ Signed refund for escrow #${escrowId}`);
      
    } catch (error) {
      console.error('Error signing refund:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to sign'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateBlocksFromDays = (days) => {
    // ~10 min per block, 144 blocks per day
    return Math.floor(days * 144);
  };

  const calculateDaysFromBlocks = (blocks) => {
    return (blocks / 144).toFixed(1);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Multi-Signature Escrow</h2>
      
      <form onSubmit={handleCreateEscrow} className="space-y-5">
        {/* Seller Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seller Address *
          </label>
          <input
            type="text"
            value={sellerAddress}
            onChange={(e) => setSellerAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escrow Amount (STX) *
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="100.0"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Platform fee: 3% ({amount ? (parseFloat(amount) * 0.03).toFixed(6) : '0'} STX)
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (Days) *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={duration ? calculateDaysFromBlocks(duration) : ''}
              onChange={(e) => setDuration(calculateBlocksFromDays(parseFloat(e.target.value) || 0).toString())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="30"
              required
            />
            <div className="px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-600 flex items-center">
              ≈ {duration || '0'} blocks
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ~144 blocks per day on Stacks blockchain
          </p>
        </div>

        {/* Required Signatures */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Signatures *
          </label>
          <select
            value={requiredSigs}
            onChange={(e) => setRequiredSigs(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="2">2 of 2 (Buyer + Seller)</option>
            <option value="3">3 of 3 (Buyer + Seller + 1 Arbiter)</option>
            <option value="4">4 of 4 (Buyer + Seller + 2 Arbiters)</option>
            <option value="5">5 of 5 (Buyer + Seller + 3 Arbiters)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Note: Additional signers will need to be added after creation (coming soon)
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isConnected}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading || !isConnected
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Creating...' : 'Create Multi-Sig Escrow'}
        </button>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </form>

      {/* My Escrows */}
      <div className="mt-8">
        <button
          onClick={() => setShowEscrows(!showEscrows)}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 transition-colors"
        >
          {showEscrows ? 'Hide' : 'Show'} My Escrows
        </button>

        {showEscrows && (
          <div className="mt-4 space-y-3">
            {escrows.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No escrows yet</p>
            ) : (
              escrows.map((escrow, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Escrow #{escrow.id}</p>
                        <p className="text-sm text-gray-600">Amount: {escrow.amount} STX</p>
                        <p className="text-sm text-gray-600">
                          Signatures: {escrow.releaseSigs}/{escrow.requiredSigs} (Release)
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: <span className={
                            escrow.status === 'pending' ? 'text-yellow-600' :
                            escrow.status === 'released' ? 'text-green-600' :
                            'text-red-600'
                          }>
                            {escrow.status}
                          </span>
                        </p>
                      </div>
                      {escrow.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSignRelease(escrow.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Sign Release
                          </button>
                          <button
                            onClick={() => handleSignRefund(escrow.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          >
                            Sign Refund
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-indigo-50 rounded-md">
        <h3 className="font-semibold text-indigo-900 mb-2">Use Cases:</h3>
        <ul className="text-sm text-indigo-800 space-y-1">
          <li>• Real estate transactions with lawyer approval</li>
          <li>• High-value freelance projects with arbitration</li>
          <li>• Business partnerships with multi-party approval</li>
          <li>• Secure escrow requiring multiple trusted signers</li>
          <li>• 3% fee for enhanced security and flexibility</li>
        </ul>
      </div>
    </div>
  );
};

export default MultiSigEscrow;
