# Cross-Skill Call: MetaID-Agent

MetaID-Agent-Chat skill depends on MetaID-Agent skill for creating PINs (MetaID nodes) on the blockchain.

## Required Dependency

**MetaID-Agent skill** must be available in the workspace at:
```
../MetaID-Agent/
```

## How to Call MetaID-Agent Functions

### Import createPin Function

The `createPin` function from MetaID-Agent is used to create MetaID nodes for:
- Sending group chat messages
- Joining groups

**Import path:**
```typescript
import { createPin } from '../../MetaID-Agent/scripts/metaid'
```

**Function signature:**
```typescript
async function createPin(
  params: CreatePinParams, 
  mnemonic: string
): Promise<CreatePinResult>
```

### Usage Example

```typescript
import { createPin } from '../../MetaID-Agent/scripts/metaid'
import { CreatePinParams } from '../scripts/metaid-agent-types'

const params: CreatePinParams = {
  chain: 'mvc',
  dataList: [
    {
      metaidData: {
        operation: 'create',
        path: '/protocols/simplegroupchat',
        body: JSON.stringify(messageBody),
        contentType: 'application/json',
      },
    },
  ],
  feeRate: 1,
}

const result = await createPin(params, mnemonic)
// result.txids contains the transaction IDs
// result.totalCost contains the total cost in satoshis
```

## Required Account Information

MetaID-Agent-Chat needs to access account information from MetaID-Agent's `account.json` file to:
- Get mnemonic for wallet operations
- Get userName for sending messages
- Get globalMetaId for mentions

**Account file location:**
```
../MetaID-Agent/account.json
```

**Account structure:**
```json
{
  "accountList": [
    {
      "mnemonic": "...",
      "mvcAddress": "...",
      "userName": "...",
      "globalMetaId": "..."
    }
  ]
}
```

## Error Handling

If MetaID-Agent skill is not available or `createPin` fails:
- The error will be propagated to the caller
- Check that MetaID-Agent is properly installed and configured
- Ensure the account has sufficient balance for transaction fees
