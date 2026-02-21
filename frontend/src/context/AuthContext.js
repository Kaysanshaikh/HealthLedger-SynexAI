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

  const login = async ({ role, hhNumber }) => {
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
        const accounts = await timeout(
          30000, // 30 second timeout
          window.ethereum.request({ method: "eth_requestAccounts" }),
          "MetaMask connection timeout. Please unlock MetaMask and try again."
        );

        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet accounts found. Please unlock MetaMask.");
        }

        walletAddress = accounts[0];
        console.log("✅ Wallet connected:", walletAddress);

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
      console.error("❌ Login error:", err);

      // User-friendly error messages
      let userMessage = "Unable to login. Please try again.";

      if (err.message.includes("User rejected") || err.message.includes("User denied")) {
        userMessage = "You rejected the connection request. Please try again and approve the request.";
      } else if (err.message.includes("timeout")) {
        userMessage = err.message;
      } else if (err.message.includes("MetaMask is not installed")) {
        userMessage = "MetaMask is not installed. Please install MetaMask extension to continue.";
      } else if (err.message.includes("No wallet accounts")) {
        userMessage = "Please unlock your MetaMask wallet and try again.";
      } else if (err.response?.data?.error) {
        userMessage = err.response.data.error;
      } else if (err.message) {
        userMessage = err.message;
      }

      setError(userMessage);
      throw new Error(userMessage);
    } finally {
      setLoading(false);
    }
  };

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

      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet accounts found. Please unlock MetaMask.");
      }

      return accounts[0];
    } catch (err) {
      if (err.message.includes("User rejected") || err.message.includes("User denied")) {
        throw new Error("You rejected the connection request. Please try again.");
      }
      throw err;
    }
  }, []);

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
    [token, user, loading, error, getWalletAddress, burnerWallet, generateBurnerWallet, clearBurnerWallet]
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
