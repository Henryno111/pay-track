import React, { useState } from 'react';

const RecurringPayment = ({ userAddress, isConnected }) => {
  const [payeeAddress, setPayeeAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('monthly');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  const intervals = [
    { value: 'daily', label: 'Daily', blocks: 144 },
    { value: 'weekly', label: 'Weekly', blocks: 1008 },
    { value: 'monthly', label: 'Monthly', blocks: 4320 },
    { value: 'yearly', label: 'Yearly', blocks: 52560 }
  ];

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!payeeAddress || !amount || parseFloat(amount) <= 0) {
      setMessage('Please fill all required fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const microAmount = Math.floor(parseFloat(amount) * 1000000);
      
      const { createSubscription } = await import('../utils/stacksConnection');
      const result = await createSubscription(payeeAddress, microAmount, interval, description);
      
      setMessage(`✅ Subscription created! ID: ${result}`);
      
      // Reset form
      setPayeeAddress('');
      setAmount('');
      setDescription('');
      
    } catch (error) {
      console.error('Error creating subscription:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to create subscription'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayment = async (subscriptionId) => {
    setLoading(true);
    setMessage('');

    try {
      const { executeSubscriptionPayment } = await import('../utils/stacksConnection');
      const result = await executeSubscriptionPayment(subscriptionId);
      
      setMessage(`✅ Payment executed! Payment #${result}`);
      
    } catch (error) {
      console.error('Error executing payment:', error);
      setMessage(`❌ Error: ${error.message || 'Payment not due yet or failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    setLoading(true);
    setMessage('');

    try {
      const { cancelSubscription } = await import('../utils/stacksConnection');
      await cancelSubscription(subscriptionId);
      
      setMessage(`✅ Subscription ${subscriptionId} cancelled`);
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to cancel'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextPayment = (intervalValue) => {
    const intervalData = intervals.find(i => i.value === intervalValue);
    const blocks = intervalData?.blocks || 4320;
    const minutes = blocks * 10; // ~10 min per block
    const hours = minutes / 60;
    const days = hours / 24;
    
    if (days < 1) return `${hours.toFixed(1)} hours`;
    if (days < 30) return `${days.toFixed(1)} days`;
    return `${(days / 30).toFixed(1)} months`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Recurring Payments</h2>
      
      <form onSubmit={handleCreateSubscription} className="space-y-5">
        {/* Payee Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payee Address *
          </label>
          <input
            type="text"
            value={payeeAddress}
            onChange={(e) => setPayeeAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount (STX) *
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5.0"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Per-payment fee: 1% ({amount ? (parseFloat(amount) * 0.01).toFixed(6) : '0'} STX)
          </p>
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Interval *
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {intervals.map(int => (
              <option key={int.value} value={int.value}>
                {int.label} (~{calculateNextPayment(int.value)})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Monthly rent payment"
            maxLength={100}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isConnected}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading || !isConnected
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Creating...' : 'Create Subscription'}
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

      {/* My Subscriptions */}
      <div className="mt-8">
        <button
          onClick={() => setShowSubscriptions(!showSubscriptions)}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 transition-colors"
        >
          {showSubscriptions ? 'Hide' : 'Show'} My Subscriptions
        </button>

        {showSubscriptions && (
          <div className="mt-4 space-y-3">
            {subscriptions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No subscriptions yet</p>
            ) : (
              subscriptions.map((sub, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Subscription #{sub.id}</p>
                      <p className="text-sm text-gray-600">{sub.description}</p>
                      <p className="text-sm text-gray-600">Amount: {sub.amount} STX</p>
                      <p className="text-sm text-gray-600">Interval: {sub.interval}</p>
                      <p className="text-sm text-gray-600">
                        Status: <span className={sub.active ? 'text-green-600' : 'text-red-600'}>
                          {sub.active ? 'Active' : 'Cancelled'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {sub.active && (
                        <>
                          <button
                            onClick={() => handleExecutePayment(sub.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            Pay Now
                          </button>
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          >
                            Cancel
                          </button>
                        </>
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
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">Use Cases:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Monthly rent or lease payments</li>
          <li>• Retainer agreements for freelancers</li>
          <li>• Subscription services and SaaS payments</li>
          <li>• Regular salary or stipend disbursements</li>
          <li>• 1% fee per payment (lower than one-time payments)</li>
        </ul>
      </div>
    </div>
  );
};

export default RecurringPayment;
