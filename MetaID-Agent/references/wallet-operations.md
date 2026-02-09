# Wallet Operations

This document describes wallet creation and management operations for MetaID-Agent.

## Wallet Creation

### Generate Mnemonic

The wallet creation process starts with generating a BIP39 mnemonic phrase:

```typescript
import { generateMnemonic } from './wallet'

const mnemonic = await generateMnemonic()
// Returns: "word1 word2 ... word12"
```

### Derive Addresses

From a mnemonic, we can derive addresses for different chains:

- **MVC Address**: Main chain for MetaID operations
- **BTC Address**: Bitcoin address (same derivation path as MVC)
- **DOGE Address**: Dogecoin address

```typescript
import { getAllAddress } from './wallet'

const addresses = await getAllAddress(mnemonic)
// Returns: { mvcAddress, btcAddress, dogeAddress }
```

### Get Public Key

The public key is derived using the MVC derivation path:

```typescript
import { getPublicKey } from './wallet'

const publicKey = await getPublicKey('mvc', mnemonic)
// Returns: hex-encoded public key
```

## Account Storage

Wallet information is stored in `account.json` at the **project root** with the following structure:

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
      "path": "m/44'/10001'/0'/0/0"
    }
  ]
}
```

### Account Selection Logic

1. **New Wallet Creation**: Triggered by keywords like "创建", "新建", "create"
2. **Existing Wallet Selection**:
   - Match by username or address from user prompt
   - If no match, use `accountList[0]` as default
   - New wallets are added to the front of the array (`unshift`)

## Wallet Operations

### Get Current Wallet

```typescript
import { getCurrentWallet, Chain } from './wallet'

const wallet = await getCurrentWallet(Chain.MVC, { mnemonic })
const address = wallet.getAddress()
const privateKey = wallet.getPrivateKey()
```

### Sign Messages

```typescript
import { getCredential } from './wallet'

const credential = await getCredential({
  mnemonic,
  chain: 'mvc',
  message: 'metalet.space'
})
// Returns: { address, publicKey, signature }
```

## Derivation Paths

- **MVC Path**: `m/44'/10001'/0'/0/0`
- **MVC Root Path**: `m/44'/10001'/0'/0`
- **Address Index**: 0 (default)

## Network Configuration

Currently configured for `livenet` (mainnet). The network is set via `getNet()` function.
