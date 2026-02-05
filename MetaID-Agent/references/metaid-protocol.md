# MetaID Protocol

This document describes MetaID registration and node creation operations.

## MetaID Registration Flow

### 1. Check UTXO Balance

Before registering, check if the wallet has UTXOs:

```typescript
import { fetchMVCUtxos } from './api'

const utxos = await fetchMVCUtxos(address)
if (utxos.length === 0) {
  // New user, need to claim gas subsidy
}
```

### 2. Claim Gas Subsidy

New users without UTXOs need to claim the initial gas subsidy:

```typescript
import { getMVCRewards, getMVCInitRewards, sleep } from './api'
import { getCredential } from './wallet'

// Step 1: Claim initial gas subsidy
await getMVCRewards({
  address: mvcAddress,
  gasChain: 'mvc'
})

// Wait for subsidy to be processed
await sleep(5000) // 5 seconds

// Step 2: Get credential for signing
const sigRes = await getCredential({
  mnemonic: mnemonic,
  chain: 'btc',
  message: 'metaso.network'
})

// Step 3: Claim init rewards with signature
await getMVCInitRewards({
  address: mvcAddress,
  gasChain: 'mvc'
}, {
  'X-Signature': sigRes.signature,
  'X-Public-Key': sigRes.publicKey
})
```

### 3. Create MetaID Node

Create a MetaID node with a username:

```typescript
import { createPin, CreatePinParams } from './metaid'

const params: CreatePinParams = {
  chain: 'mvc',
  dataList: [
    {
      metaidData: {
        operation: 'create',
        path: '/info/name',
        body: 'username',
        contentType: 'text/plain',
      }
    }
  ],
  feeRate: 1,
}

const result = await createPin(params, mnemonic)
// Returns: { txids: string[], totalCost: number }
```

### 4. Fetch User Info and Get globalMetaId

After successful MetaID node creation, fetch user information by address to get the globalMetaId:

```typescript
import { getUserInfoByAddressByMs } from './api'

// Fetch user info by address
const userInfo = await getUserInfoByAddressByMs(mvcAddress)

if (userInfo && userInfo.globalMetaId) {
  // Update account with username and globalMetaId
  account.userName = username
  account.globalMetaId = userInfo.globalMetaId
  writeAccountFile(accountData)
}
```

The `getUserInfoByAddressByMs()` function calls the MetaID service API (`https://file.metaid.io/metafile-indexer/api/v1/users/address/{address}`) to retrieve user information including:
- `address`: User's address
- `avatar`: Avatar information
- `avatarPinId`: Avatar PIN ID
- `chatPublicKey`: Chat public key
- `chatPublicKeyId`: Chat public key ID
- `metaId`: MetaID
- `globalMetaId`: Global MetaID (supports multiple chains: MVC/BTC/DOGE)
- `name`: Username
- `namePinId`: Name PIN ID
- `chainName`: Chain name

### 5. Update Account

After successful registration and fetching user info, update the account with the username and globalMetaId:

```typescript
account.userName = username
if (userInfo && userInfo.globalMetaId) {
  account.globalMetaId = userInfo.globalMetaId
}
writeAccountFile(accountData)
```

## MetaID Node Structure

### Operation Types

- `init`: Initialize MetaID
- `create`: Create a new node
- `modify`: Modify an existing node
- `revoke`: Revoke a node

### Common Paths

- `/info/name`: Username node
- `/protocols/simplebuzz`: Buzz message node
- `/info/avatar`: Avatar node
- `/info/bio`: Bio node

### Content Types

- `text/plain`: Plain text
- `text/plain;utf-8`: UTF-8 encoded text
- `application/json`: JSON data
- `image/png`: PNG image
- `image/jpeg`: JPEG image

## PIN Creation Process

### MVC Chain

For MVC chain, the process involves:

1. Build OP_RETURN output with MetaID data
2. Add P2PKH outputs (1 satoshi to self, optional service fee)
3. Select UTXOs to cover fees
4. Sign transaction
5. Broadcast to network

### DOGE Chain

For DOGE chain, the process uses a commit-reveal scheme:

1. Build inscription script with MetaID data
2. Create commit transaction (P2SH output)
3. Create reveal transaction (unlock P2SH, send to reveal address)
4. Sign both transactions
5. Broadcast commit transaction first, then reveal transaction

The DOGE implementation uses the `DogeInscribe` class which handles:
- Inscription script building
- P2SH lock script creation
- Commit and reveal transaction construction
- Fee calculation (DOGE uses satoshis/KB fee rate)

### Transaction Structure

**MVC Chain:**
```
Inputs:
  - UTXOs from wallet address

Outputs:
  - 1 satoshi to self (required)
  - OP_RETURN with MetaID data
  - Service fee (optional)
  - Change output (if needed)
```

**DOGE Chain:**
```
Commit Transaction:
  Inputs:
    - P2PKH UTXOs from wallet
  Outputs:
    - P2SH output (contains inscription)
    - Change output (if needed)

Reveal Transaction:
  Inputs:
    - P2SH output from commit transaction
    - Additional P2PKH UTXOs (for fees)
  Outputs:
    - P2PKH output to reveal address
    - Change output (if needed)
```

## Error Handling

Common errors during MetaID registration:

- **No UTXOs**: User needs to claim gas subsidy first
- **Insufficient balance**: Not enough funds to pay fees
- **Invalid username**: Username already taken or invalid format
- **Network error**: Failed to broadcast transaction

All errors are logged to `log/error.md` with context and stack traces.
