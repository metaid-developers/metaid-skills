---
name: MetaID-Agent
description: Create and manage MetaID wallets and accounts. This skill handles wallet creation, MetaID registration, node creation, and sending Buzz messages on the MVC network. Use when users want to: (1) Create a new MetaID Agent/robot/proxy with a wallet, (2) Register a MetaID account, (3) Create MetaID nodes, (4) Send Buzz messages to the MVC network. Requires Node.js >= 18.x.x and TypeScript. Dependencies: @scure/bip39, @metalet/utxo-wallet-service, bitcoinjs-lib, ecpair, @bitcoinerlab/secp256k1, crypto-js, meta-contract.
---

# MetaID-Agent

MetaID-Agent skill provides comprehensive wallet and MetaID account management capabilities for the MVC network. It handles the complete lifecycle from wallet creation to MetaID registration and Buzz message sending.

## Core Capabilities

1. **Wallet Creation** - Generate mnemonic phrases and derive addresses for MVC, BTC, and DOGE chains
2. **MetaID Registration** - Register new MetaID accounts with gas subsidies (including MVC init rewards)
3. **MetaID Node Creation** - Create MetaID nodes with custom usernames on MVC and DOGE chains
4. **Buzz Messaging** - Send Buzz messages to the MVC network using simpleBuzz protocol

## Prerequisites

Before using this skill, ensure:
- Node.js >= 18.x.x is installed
- TypeScript is installed globally or available in the project
- All required dependencies are installed (see Dependencies section)

Run `scripts/check_environment.sh` to verify the environment.

## Dependencies

This skill requires the following npm packages with specific versions:
- `@scure/bip39@1.6.0`
- `@metalet/utxo-wallet-service@0.3.33-beta.5`
- `bitcoinjs-lib@6.1.7`
- `ecpair`
- `@bitcoinerlab/secp256k1@1.2.0`
- `crypto-js`
- `meta-contract`

Install dependencies with:
```bash
npm install @scure/bip39@1.6.0 @metalet/utxo-wallet-service@0.3.33-beta.5 bitcoinjs-lib@6.1.7 ecpair @bitcoinerlab/secp256k1@1.2.0 crypto-js meta-contract
```

## Workflow Overview

The MetaID-Agent workflow consists of three main phases:

1. **Wallet Creation** - Generate mnemonic, derive addresses, save to `account.json` (project root)
2. **MetaID Registration** - Claim gas subsidy, create MetaID node with username
3. **Buzz Creation** - Send initial Buzz message to the network

## Usage

### Trigger Detection

The skill activates when user prompts contain keywords like:
- "我要创建一个 MetaID Agent"
- "我要创建一个代理"
- "我要创建一个机器人"
- "创建 MetaID 钱包"
- "注册 MetaID"

### Wallet Selection Logic

1. **New Wallet Creation**: Triggered when keywords indicate creation intent
2. **Existing Wallet Selection**: 
   - If root `account.json` exists with accounts, match by username/address from user prompt
   - If no match found, use accountList[0] as default
   - New wallets are unshifted to the front of accountList

### Main Execution Flow

Execute the main script:
```bash
ts-node scripts/main.ts "<user_prompt>"
```

The script will:
1. Check environment prerequisites
2. Parse user prompt for username and buzz content
3. Determine if wallet creation or selection is needed
4. Create/select wallet and save to root `account.json`
5. Register MetaID if userName is empty
6. Create MetaID node with username
7. Fetch user info by address to get globalMetaId and update root `account.json`
8. Send Buzz message if content is provided

## Account Management

Account data is stored in `account.json` at the **project root** (MetaApp-Skill/) with the following structure:

```json
{
  "accountList": [
    {
      "mnemonic": "word1 word2 ... word12",
      "mvcAddress": "MVC address",
      "btcAddress": "BTC address",
      "dogeAddress": "DOGE address",
      "publicKey": "hex public key",
      "userName": "username or empty string",
      "path": "m/44'/10001'/0'/0/0",
      "globalMetaId": "global metaid (optional, fetched after MetaID registration)"
    }
  ]
}
```

**Important Note**: 
- Account file location: **project root** `account.json` (shared with MetaID-Agent-Chat).
- If `MetaID-Agent/account.json` exists, it will be migrated to root on first run.
- Empty accounts (accounts with empty mnemonic) are automatically filtered out when writing. The system will not save accounts that have not been properly initialized.
- When creating a new `account.json` file, it will be initialized with an empty `accountList` array. The template file `template/demo-account.json` contains an example structure, but empty account entries should not be written to the actual `account.json` file.
- After MetaID registration is completed, the system will automatically fetch user information by address using `getUserInfoByAddressByMs()` API to retrieve the `globalMetaId` (global MetaID supporting multiple chains: MVC/BTC/DOGE) and save it to the account record in `account.json`.

## Error Handling

All errors are logged to `log/error.md` with:
- Error message
- Method/function where error occurred
- Timestamp
- Execution context

## Scripts

- `check_environment.sh` - Validates Node.js and TypeScript installation
- `wallet.ts` - Wallet creation and address derivation functions (supports MVC, BTC, DOGE)
- `api.ts` - API functions for fetching UTXOs, broadcasting transactions, and claiming rewards
- `metaid.ts` - MetaID registration and node creation functions (supports MVC and DOGE chains)
- `doge.ts` - DOGE chain specific inscription and transaction building functions
- `buzz.ts` - Buzz message creation and sending
- `main.ts` - Main orchestration script

## References

For detailed implementation details, see:
- `references/wallet-operations.md` - Wallet creation and management (MVC, BTC, DOGE)
- `references/metaid-protocol.md` - MetaID registration and node creation
- `references/buzz-protocol.md` - Buzz message protocol
