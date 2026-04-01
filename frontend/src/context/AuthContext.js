import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import Web3 from "web3";
import { ethers } from "ethers";
import client from "../api/client";

const STORAGE_KEY_TOKEN = "hl_token";
const STORAGE_KEY_USER = "hl_user";
const STORAGE_KEY_BURNER_PK = "hl_burner_pk";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY_TOKEN));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem(STORAGE_KEY_USER);
    return cached ? JSON.parse(cached) : null;
  });

  // Burner wallet state
  const [burnerWallet, setBurnerWallet] = useState(() => {
    const pk = localStorage.getItem(STORAGE_KEY_BURNER_PK);
    return pk ? new ethers.Wallet(pk) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  // --- Burner Wallet Management ---
  const generateBurnerWallet = useCallback(() => {
    const wallet = ethers.Wallet.createRandom();
    localStorage.setItem(STORAGE_KEY_BURNER_PK, wallet.privateKey);
    setBurnerWallet(wallet);
    return wallet;
  }, []);

  const clearBurnerWallet = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_BURNER_PK);
    setBurnerWallet(null);
  }, []);
  // --------------------------------

  const login = useCallback(async ({ role, hhNumber }) => {
    setLoading(true);
    setError(null);

    // Timeout for MetaMask operations
    const timeout = (ms, promise, errorMessage) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(errorMessage)), ms)
        )
      ]);
    };

    // Centralized Crypto Error Handler
    const getFriendlyErrorMessage = (err) => {
      console.error("🔍 Decoding Web3 Error:", err);
      
      // Standardize error code detection
      const code = err.code || (err.error && err.error.code);
      const message = err.message || (err.error && err.error.message) || "";

      if (code === -32002) {
        return "🛡️ A MetaMask request is already pending. Please click the MetaMask extension icon to approve the connection!";
      }
      if (message.includes("User rejected") || message.includes("User denied")) {
        return "❌ You rejected the connection request. Please try again and approve the request in MetaMask.";
      }
      if (message.includes("timeout")) {
        return "⏰ MetaMask connection timeout. Please unlock your wallet and try again.";
      }
      if (message.includes("MetaMask is not installed")) {
        return "🦊 MetaMask is not installed. Please install MetaMask extension to continue.";
      }
      if (message.includes("No valid wallet accounts")) {
        return "🔑 No valid wallet account selected. Please unlock MetaMask and ensure an account is selected.";
      }
      
      return err.response?.data?.error || message || "Unable to login. Please try again.";
    };

    try {
      console.log("🔐 Starting login process...", { role, hhNumber });

      let walletAddress;
      let signature;
      let message;

      if (burnerWallet) {
        // --- BURNER WALLET FLOW ---
        console.log("🔥 Using Burner Wallet for Login...");
        walletAddress = burnerWallet.address;
        message = `Welcome to HealthLedger SynexAI!\n\nSign this message to log in as a ${role}.\n\nWallet: ${walletAddress}`;

        console.log("✍️ Signing message with Burner Wallet...");
        // Ethers.js Wallet signMessage
        signature = await burnerWallet.signMessage(message);

      } else {
        // --- METAMASK FLOW ---
        // Check if MetaMask is installed
        if (!window.ethereum) {
          throw new Error("MetaMask is not installed. Please install MetaMask extension to continue.");
        }

        // Check if MetaMask is unlocked
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length === 0) {
            console.log("MetaMask is locked or no accounts connected");
          }
        } catch (err) {
          console.log("Could not check MetaMask status");
        }

        // 1. Get accounts with timeout
        console.log("📱 Requesting MetaMask accounts...");
        let accounts;
        try {
          accounts = await timeout(
            30000, // 30 second timeout
            window.ethereum.request({ method: "eth_requestAccounts" }),
            "MetaMask connection timeout. Please unlock MetaMask and try again."
          );
        } catch (requestErr) {
          // If a request is already pending, we should handle it early
          if (requestErr.code === -32002) {
            const msg = "🛡️ A MetaMask request is already pending. Please click the fox icon in your browser to approve it!";
            alert(msg);
            throw new Error(msg);
          }
          throw requestErr;
        }

        // Handle cases where provider returns an object { result: null, error: ... } instead of throwing
        if (accounts && accounts.error) {
          throw accounts.error;
        }

        if (!accounts || !Array.isArray(accounts) || accounts.length === 0 || !accounts[0]) {
          console.error("❌ Invalid accounts array returned from MetaMask:", accounts);
          throw new Error("No valid wallet accounts found. Please ensure your MetaMask is unlocked and you have selected an account.");
        }

        walletAddress = accounts[0];
        console.log("✅ Wallet connected successfully:", walletAddress);

        // 2. Create message to sign
        message = `Welcome to HealthLedger SynexAI!\n\nSign this message to log in as a ${role}.\n\nWallet: ${walletAddress}`;
        const web3 = new Web3(window.ethereum);

        // 3. Sign message with timeout
        console.log("✍️ Requesting signature from MetaMask...");
        signature = await timeout(
          60000, // 60 second timeout for signing
          web3.eth.personal.sign(message, walletAddress, ''),
          "Signature request timeout. Please check MetaMask and try again."
        );
      }
      console.log("✅ Message signed successfully");

      // 4. Verify on backend
      console.log("🔄 Sending login request to backend...");
      const response = await client.post("/users/login", {
        role,
        hhNumber,
        walletAddress,
        signature,
        message,
      });

      console.log("✅ Login successful:", response.data);
      const { token: apiToken, user: apiUser } = response.data;
      setToken(apiToken);
      setUser(apiUser);
      return { token: apiToken, user: apiUser };
    } catch (err) {
      const userMessage = getFriendlyErrorMessage(err);
      console.error("❌ Login failed:", userMessage, err);

      setError(userMessage);
      // Production grade check: Bring the error to the user's immediate attention via alert
      alert(userMessage);
      throw new Error(userMessage);
    } finally {
      setLoading(false);
    }
  }, [burnerWallet]);

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
  };

  const getWalletAddress = useCallback(async () => {
    if (burnerWallet) {
      return burnerWallet.address;
    }

    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Please install MetaMask extension.");
    }

    // Timeout helper
    const timeout = (ms, promise) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MetaMask connection timeout. Please unlock MetaMask and try again.")), ms)
        )
      ]);
    };

    try {
      const accounts = await timeout(
        30000, // 30 second timeout
        window.ethereum.request({ method: "eth_requestAccounts" })
      );

      if (!accounts || !Array.isArray(accounts) || accounts.length === 0 || !accounts[0]) {
        console.error("❌ Invalid accounts array returned from MetaMask (getWalletAddress):", accounts);
        throw new Error("No valid wallet accounts found. Please unlock your MetaMask and ensure an account is selected.");
      }

      return accounts[0];
    } catch (err) {
      if (err.message.includes("User rejected") || err.message.includes("User denied")) {
        throw new Error("You rejected the connection request. Please try again.");
      }
      throw err;
    }
  }, [burnerWallet]);

  const value = useMemo(
    () => ({
      token,
      user,
      walletAddress: user?.walletAddress,
      isAuthenticated: Boolean(token && user),
      burnerWallet,
      isUsingBurnerWallet: Boolean(burnerWallet),
      generateBurnerWallet,
      clearBurnerWallet,
      login,
      logout,
      loading,
      error,
      clearError: () => setError(null),
      getWalletAddress,
    }),
    [token, user, loading, error, getWalletAddress, burnerWallet, generateBurnerWallet, clearBurnerWallet, login]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
