# How to Test HealthLedger with MetaMask

Welcome to the HealthLedger SynexAI Federated Learning Portal! 

If you are a new user and want to test the application using your own real blockchain wallet instead of our "Burner Wallets", follow this guide.

## Prerequisites
HealthLedger operates on the **Polygon Amoy Testnet**. This means transactions are real blockchain events, but they use "testnet" MATIC which has no real-world value. 

To use the app, you need:
1. A Web3 Wallet (We recommend **MetaMask**).
2. The Polygon Amoy network added to your wallet.
3. A small amount of Amoy Testnet MATIC (to cover gas fees, though the backend covers most).

---

## Step 1: Install MetaMask
If you don't already have a crypto wallet, you'll need to install MetaMask.

1. Go to the official website: [https://metamask.io/download/](https://metamask.io/download/)
2. Click **Install MetaMask** for your browser (Chrome, Firefox, Brave, or Edge).
3. Follow the extension's setup instructions:
   * Click "Create a new wallet".
   * Create a strong password.
   * **Crucial:** Write down your 12-word Secret Recovery Phrase and store it safely offline. Never share this phrase with anyone.

## Step 2: Add Polygon Amoy Testnet to MetaMask
By default, MetaMask connects to the Ethereum Mainnet. You need to tell it how to talk to our testnet.

1. Open your MetaMask extension and log in.
2. Click the network dropdown at the very top left of the MetaMask window (it usually says "Ethereum Mainnet").
3. Click **Add network**.
4. Scroll down and click **Add a network manually**.
5. Fill in the following details exactly:
   * **Network Name:** Polygon Amoy
   * **New RPC URL:** `https://rpc-amoy.polygon.technology/`
   * **Chain ID:** `80002`
   * **Currency Symbol:** `MATIC`
   * **Block Explorer URL:** `https://www.oklink.com/amoy`
6. Click **Save** and then **Switch to Polygon Amoy**.

## Step 3: Get Free Testnet MATIC (Optional but Recommended)
While the HealthLedger backend pays the gas fees for major actions like registering a patient or doctor, it's always good practice to have a little testnet MATIC in your wallet for web3 transactions.

1. Copy your MetaMask wallet address (click on the account name/address at the top of the MetaMask window to copy it).
2. Go to a Polygon Amoy Faucet. Two reliable ones are:
   * [Polygon Faucet](https://faucet.polygon.technology/) (Requires logging in with Discord)
   * [Alchemy Amoy Faucet](https://www.alchemy.com/faucets/polygon-amoy) (Requires a free Alchemy account)
3. Paste your wallet address into the faucet and request tokens.
4. Wait a minute or two, and you should see the testnet MATIC appear in your MetaMask wallet.

## Step 4: Login and Register on HealthLedger
Now you are ready to use the app!

1. Navigate to the HealthLedger **Patient Registration** or **Doctor Registration** page.
2. Your browser should prompt you to connect MetaMask. If a popup appears, click **Next** and **Connect** to allow HealthLedger to see your wallet address.
3. Notice that the "Wallet Address" field in the registration form is now automatically filled with your real MetaMask address!
4. Fill out the rest of the form and click **Register**.
5. Once registered, go to the **Login** page and select your role.
6. MetaMask will pop up again asking you to **Sign a Message**. This is perfectly safe and costs no gas—it simply proves you own the wallet you are trying to log in with.
7. Click **Sign**.

You are now logged in and ready to interact with the Federated Learning network using your own crypto wallet!
