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
