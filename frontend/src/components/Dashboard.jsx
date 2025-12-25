import React, { useState, useEffect } from 'react';
import { callReadOnlyFunction, cvToValue, principalCV } from '@stacks/transactions';
import { StacksTestnet, StacksMainnet } from '@stacks/network';

const USE_MAINNET = process.env.REACT_APP_NETWORK === 'mainnet';
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

function Dashboard({ userAddress }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const network = USE_MAINNET ? new StacksMainnet() : new StacksTestnet();

  useEffect(() => {
    loadUserData();
  }, [userAddress]);

  const loadUserData = async () => {
    try {
      // Call read-only function to get user data
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
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
