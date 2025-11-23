# Deployment Guide

## 1. Smart Contract Deployment (Base Mainnet)
1.  Go to [Remix IDE](https://remix.ethereum.org).
2.  Create a new file `BountyBoard.sol` and paste the content from `contracts/BountyBoard.sol`.
3.  Compile the contract (Solidity Compiler tab).
4.  Deploy (Deploy & Run Transactions tab):
    *   Environment: **Injected Provider - MetaMask** (Ensure you are on Base Mainnet).
    *   Deploy.
5.  Copy the **Deployed Contract Address**.
6.  Update your `.env.local` (and Vercel Environment Variables):
    ```
    NEXT_PUBLIC_BOUNTYCAST_ADDRESS=0xYourDeployedAddress
    ```

## 2. Push to GitHub
1.  **Initialize Git** (if you haven't already):
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  **Create a Repository on GitHub**:
    *   Go to [GitHub.com/new](https://github.com/new).
    *   Name it `bountycast`.
    *   Click **Create repository**.
3.  **Push your code**:
    *   Copy the commands under "…or push an existing repository from the command line".
    *   It will look like this:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/bountycast.git
    git branch -M main
    git push -u origin main
    ```

## 3. Create Vercel Project & Database
**Option A: The Easy Way (via GitHub)**
1.  Push your code to a GitHub repository.
2.  Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
3.  Import your GitHub repository.
4.  **Before clicking Deploy**:
    *   Expand **"Environment Variables"**.
    *   Add `NEXT_PUBLIC_BOUNTYCAST_ADDRESS` with your contract address.
5.  Click **Deploy**.

**Option B: The Direct Way (via Command Line)**
1.  Run `npx vercel` in your terminal.
2.  Follow the prompts (Login -> Yes to deploy -> Link to existing project? No -> Project Name: bountycast).
3.  Wait for deployment to finish.

## 4. Configure Database (Vercel Postgres)
Once your project is created on Vercel:
1.  Go to your Project Dashboard on Vercel.
2.  Click the **"Storage"** tab at the top.
3.  Click **"Connect Store"** (or "Create").
4.  Select **"Postgres"** -> **"Continue"**.
5.  Accept the terms and click **"Create"**.
6.  **Important**: Select your project (`bountycast`) to connect it to, then click **"Connect"**.
    *   *This automatically adds the `POSTGRES_URL` environment variables to your project.*
7.  **Initialize the Tables**:
    *   In the Storage tab, click on your new database (e.g., `bountycast-postgres`).
    *   Click **"Query"** on the left sidebar.
    *   Paste and run this SQL command:

```sql
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  fid INTEGER,
  username TEXT,
  address TEXT,
  question TEXT,
  bounty REAL,
  token TEXT,
  created BIGINT,
  deadline BIGINT,
  onchainId INTEGER,
  status TEXT
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  questionId INTEGER,
  fid INTEGER,
  username TEXT,
  address TEXT,
  answer TEXT,
  upvotes INTEGER DEFAULT 0
);
```

## 5. Final Redeploy
1.  After creating the database, go to the **"Deployments"** tab.
2.  Click the three dots on your latest deployment -> **"Redeploy"**.
    *   *This ensures the running app picks up the new database environment variables.*

## 6. Farcaster Mini App Registration
1.  Go to [Warpcast Developers](https://warpcast.com/~/developers).
2.  Create a new Mini App.
3.  Set the **App URL** to your Vercel deployment URL (e.g., `https://bountycast.vercel.app`).
4.  Ensure your `manifest.json` is accessible at `https://bountycast.vercel.app/manifest.json`.

