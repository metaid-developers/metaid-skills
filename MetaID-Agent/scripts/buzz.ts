import { createPin, CreatePinParams, PinDetail } from './metaid'

export interface BuzzBody {
  content: string
  contentType: string
  attachments: any[]
  quotePin: string
}

/**
 * Create and send a Buzz message
 */
export async function createBuzz(
  mnemonic: string,
  content: string,
  feeRate: number = 1
): Promise<{ txids: string[]; totalCost: number }> {
  if (!mnemonic) {
    throw new Error('mnemonic is required')
  }

  if (!content) {
    throw new Error('content is required')
  }

  const body: BuzzBody = {
    content: content,
    contentType: 'text/plain;utf-8',
    attachments: [],
    quotePin: ''
  }

  const params: CreatePinParams = {
    chain: 'mvc',
    dataList: [
      {
        metaidData: {
          operation: 'create',
          path: '/protocols/simplebuzz',
          body: JSON.stringify(body),
          contentType: 'application/json',
        }
      }
    ],
    feeRate: feeRate,
  }

  const result = await createPin(params, mnemonic)
  
  if (result.txids && result.txids.length > 0) {
    return {
      txids: result.txids,
      totalCost: result.totalCost
    }
  } else {
    throw new Error('Failed to create buzz: no txids returned')
  }
}
