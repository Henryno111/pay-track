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

// Network configuration - Change to StacksMainnet() for production
const USE_MAINNET = process.env.REACT_APP_NETWORK === 'mainnet';
const network = USE_MAINNET ? new StacksMainnet() : new StacksTestnet();

// Contract address - Update after deployment
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

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
    return USE_MAINNET ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;
  }
  return null;
};

// Register user
export const registerUser = async (username) => {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
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
    contractAddress: CONTRACT_ADDRESS,
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
    contractAddress: CONTRACT_ADDRESS,
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
    contractAddress: CONTRACT_ADDRESS,
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
