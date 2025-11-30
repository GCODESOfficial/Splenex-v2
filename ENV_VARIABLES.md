# Environment Variables Configuration

This document describes the environment variables needed for Splenex.

## Required Configuration

Create a `.env.local` file in the `Splenex` directory with the following variables:

### Executor Address (for limit orders and fee collection)
```bash
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9
```

**Why this matters:**
- The executor address is used for permit signatures and limit order execution
- Moving hardcoded addresses to environment variables helps MetaMask recognize legitimate contracts
- This reduces false positive security warnings

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### RPC URLs (optional - defaults provided)
```bash
ETH_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
POLYGON_RPC_URL=https://polygon-rpc.com
```

### LiFi API Key (optional - for advanced routing)
```bash
LIFI_API_KEY=your_lifi_api_key_here
```

### Moralis API Key (required - for token balance fetching)
```bash
MORALIS_API_KEY=your_moralis_api_key_here
```
**Why this matters:**
- Moralis is used to fetch wallet token balances across all supported chains
- Get your API key from https://moralis.io
- This is a server-side only variable (no NEXT_PUBLIC_ prefix needed)
- **Important:** After adding this to your .env file, restart your Next.js dev server

### Executor Private Key (server-side only)
```bash
EXECUTOR_PRIVATE_KEY=your_executor_private_key_here
```
**⚠️ WARNING:** Never expose this in client-side code or commit to git

### Splenex Smart Contract Address (if using custom contracts)
```bash
SPLENEX_CONTRACT_ADDRESS=your_contract_address_here
```

## Example .env.local file

```bash
# Executor Address (for limit orders and fee collection)
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# RPC URLs (optional - defaults provided)
ETH_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
POLYGON_RPC_URL=https://polygon-rpc.com

# LiFi API Key (optional - for advanced routing)
LIFI_API_KEY=your_lifi_api_key_here

# Moralis API Key (required - for token balance fetching)
MORALIS_API_KEY=your_moralis_api_key_here

# Executor Private Key (server-side only - for limit order execution)
EXECUTOR_PRIVATE_KEY=your_executor_private_key_here

# Splenex Smart Contract Address (if using custom contracts)
SPLENEX_CONTRACT_ADDRESS=your_contract_address_here
```

## Security Notes

1. **Client-side variables** must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
2. **Server-side variables** (without `NEXT_PUBLIC_`) are only available in API routes and server components
3. Never commit `.env.local` to version control - it's automatically ignored by git
4. The executor address is now configurable to help MetaMask recognize legitimate contracts

