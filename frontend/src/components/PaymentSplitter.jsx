import React, { useState } from 'react';

const PaymentSplitter = ({ userAddress, isConnected }) => {
  const [recipients, setRecipients] = useState([
    { address: '', percentage: '' }
  ]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const addRecipient = () => {
    if (recipients.length < 20) {
      setRecipients([...recipients, { address: '', percentage: '' }]);
    }
  };

  const removeRecipient = (index) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(newRecipients.length > 0 ? newRecipients : [{ address: '', percentage: '' }]);
  };

  const updateRecipient = (index, field, value) => {
    const newRecipients = [...recipients];
    newRecipients[index][field] = value;
    setRecipients(newRecipients);
  };

  const getTotalPercentage = () => {
    return recipients.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
  };

  const handleSplit = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setMessage('Please connect your wallet first');
      return;
    }

    // Validation
    const totalPercentage = getTotalPercentage();
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setMessage(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`);
      return;
    }

    const validRecipients = recipients.filter(r => r.address && r.percentage);
    if (validRecipients.length === 0) {
      setMessage('Please add at least one recipient');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Convert to microSTX (1 STX = 1,000,000 microSTX)
      const microAmount = Math.floor(parseFloat(amount) * 1000000);
      
      // Convert percentages to basis points (100% = 10000)
      const recipientList = validRecipients.map(r => ({
        recipient: r.address,
        percentage: Math.floor(parseFloat(r.percentage) * 100)
      }));

      // Import functions from stacksConnection
      const { executeSplitPayment } = await import('../utils/stacksConnection');
      
      const result = await executeSplitPayment(microAmount, recipientList);
      
      setMessage(`✅ Payment split successful! Transaction ID: ${result}`);
      
      // Reset form
      setRecipients([{ address: '', percentage: '' }]);
      setAmount('');
      setDescription('');
      
    } catch (error) {
      console.error('Error splitting payment:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to split payment'}`);
    } finally {
      setLoading(false);
    }
  };

  const distributeEqually = () => {
    const validCount = recipients.filter(r => r.address).length;
    if (validCount === 0) return;
    
    const equalPercentage = (100 / validCount).toFixed(2);
    const newRecipients = recipients.map(r => ({
      ...r,
      percentage: r.address ? equalPercentage : r.percentage
    }));
    setRecipients(newRecipients);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Split Payment</h2>
      
      <form onSubmit={handleSplit} className="space-y-6">
        {/* Total Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Amount (STX)
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="10.5"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Fee: 1.5% ({amount ? (parseFloat(amount) * 0.015).toFixed(6) : '0'} STX)
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Team payment for Q4 project"
            maxLength={100}
          />
        </div>

        {/* Recipients */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Recipients ({recipients.filter(r => r.address).length}/20)
            </label>
            <button
              type="button"
              onClick={distributeEqually}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Distribute Equally
            </button>
          </div>

          <div className="space-y-3">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={recipient.address}
                    onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    value={recipient.percentage}
                    onChange={(e) => updateRecipient(index, 'percentage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="25.00"
                    min="0"
                    max="100"
                  />
                </div>
                <span className="text-gray-500 py-2 w-6">%</span>
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {recipients.length < 20 && (
            <button
              type="button"
              onClick={addRecipient}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              + Add Recipient
            </button>
          )}

          <div className="mt-2 text-sm">
            <span className={`font-medium ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              Total: {getTotalPercentage().toFixed(2)}%
            </span>
            {Math.abs(getTotalPercentage() - 100) > 0.01 && (
              <span className="text-red-600 ml-2">
                (Must equal 100%)
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isConnected}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading || !isConnected
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {loading ? 'Processing...' : 'Split Payment'}
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

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Add up to 20 recipients with custom percentage splits</li>
          <li>• Total percentages must equal exactly 100%</li>
          <li>• A 1.5% platform fee is deducted from the total amount</li>
          <li>• Perfect for team payments, revenue sharing, and commissions</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentSplitter;
