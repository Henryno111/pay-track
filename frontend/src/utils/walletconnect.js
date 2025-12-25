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
