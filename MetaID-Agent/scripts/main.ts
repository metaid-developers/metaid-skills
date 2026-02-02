#!/usr/bin/env node

import * as path from 'path'
import { generateMnemonic, getAllAddress, getPublicKey, getPath, getUtxos, getCredential } from './wallet'
import { getMVCRewards, getMVCInitRewards, sleep } from './api'
import { createPin, CreatePinParams } from './metaid'
import { createBuzz } from './buzz'
import {
  readAccountFile,
  writeAccountFile,
  ensureAccountFile,
  findAccountByKeyword,
  logError,
  extractUsername,
  extractBuzzContent,
  shouldCreateWallet,
  Account
} from './utils'

async function main() {
  const userPrompt = process.argv[2] || ''
  
  if (!userPrompt) {
    console.error('Usage: ts-node main.ts "<user_prompt>"')
    process.exit(1)
  }

  try {
    // Step 1: Check if we need to create a new wallet or use existing
    const needCreateWallet = shouldCreateWallet(userPrompt)
    ensureAccountFile()
    let accountData = readAccountFile()
    let currentAccount: Account | null = null

    if (needCreateWallet || accountData.accountList.length === 0) {
      // Create new wallet
      console.log('🔐 Creating new wallet...')
      const mnemonic = await generateMnemonic()
      const addresses = await getAllAddress(mnemonic)
      const publicKey = await getPublicKey('mvc', mnemonic)
      const path = getPath()

      const newAccount: Account = {
        mnemonic,
        mvcAddress: addresses.mvcAddress,
        btcAddress: addresses.btcAddress,
        dogeAddress: addresses.dogeAddress,
        publicKey,
        userName: '',
        path
      }

      // Unshift to front of array
      accountData.accountList.unshift(newAccount)
      writeAccountFile(accountData)
      currentAccount = newAccount
      console.log('✅ Wallet created successfully')
    } else {
      // Select existing wallet
      const username = extractUsername(userPrompt)
      if (username) {
        currentAccount = findAccountByKeyword(username, accountData)
      }
      
      if (!currentAccount) {
        // Use first account as default
        currentAccount = accountData.accountList[0]
      }
      console.log(`📝 Using wallet: ${currentAccount.mvcAddress}`)
    }

    if (!currentAccount) {
      throw new Error('No account available')
    }

    // Step 2: Extract username and buzz content from prompt
    const username = extractUsername(userPrompt)
    if (!username && needCreateWallet) {
      throw new Error('Username is required. Please provide a username in your prompt (e.g., "名字叫\'Sunny\'")')
    }

    const buzzContent = extractBuzzContent(userPrompt)

    // Step 3: Register MetaID if userName is empty
    if (!currentAccount.userName && username) {
      console.log('📝 Registering MetaID account...')
      
      // Check if user has UTXOs
      const utxos = await getUtxos('mvc', currentAccount.mnemonic)
      
      if (utxos.length === 0) {
        // New user, claim gas subsidy
        console.log('💰 Claiming gas subsidy...')
        await getMVCRewards({
          address: currentAccount.mvcAddress,
          gasChain: 'mvc'
        })
        console.log('⏳ Waiting for subsidy to be processed...')
        await sleep(5000) // Wait 5 seconds
        
        // Get credential for signing
        console.log('🔐 Getting credential for init rewards...')
        const sigRes = await getCredential({
          mnemonic: currentAccount.mnemonic,
          chain: 'btc',
          message: 'metaso.network'
        })
        
        // Call getMVCInitRewards
        console.log('💰 Claiming init rewards...')
        await getMVCInitRewards({
          address: currentAccount.mvcAddress,
          gasChain: 'mvc'
        }, {
          'X-Signature': sigRes.signature,
          'X-Public-Key': sigRes.publicKey
        })
        console.log('✅ Init rewards claimed successfully')
      }

      // Create MetaID node with username
      console.log(`🏷️  Creating MetaID node with username: ${username}`)
      const namePinParams: CreatePinParams = {
        chain: 'mvc',
        dataList: [
          {
            metaidData: {
              operation: 'create',
              path: '/info/name',
              body: username,
              contentType: 'text/plain',
            }
          }
        ],
        feeRate: 1,
      }

      const namePinRes = await createPin(namePinParams, currentAccount.mnemonic)
      
      if (namePinRes.txids && namePinRes.txids.length > 0) {
        console.log('✅ MetaID node created successfully')
        
        // Update account with username
        const accountIndex = accountData.accountList.findIndex(
          acc => acc.mvcAddress === currentAccount!.mvcAddress
        )
        if (accountIndex >= 0) {
          accountData.accountList[accountIndex].userName = username
          writeAccountFile(accountData)
          currentAccount.userName = username
        }
      } else {
        throw new Error('Failed to create MetaID node: no txids returned')
      }
    } else if (currentAccount.userName) {
      console.log(`✅ MetaID already registered: ${currentAccount.userName}`)
    }

    // Step 4: Send Buzz message if content is provided
    if (buzzContent) {
      console.log(`📢 Sending Buzz message: ${buzzContent}`)
      const buzzResult = await createBuzz(currentAccount.mnemonic, buzzContent, 1)
      
      if (buzzResult.txids && buzzResult.txids.length > 0) {
        console.log(`✅ Buzz sent successfully!`)
        console.log(`   TXID: ${buzzResult.txids[0]}`)
        console.log(`   Cost: ${buzzResult.totalCost} satoshis`)
      } else {
        throw new Error('Failed to send buzz: no txids returned')
      }
    }

    console.log('\n✅ All operations completed successfully!')
    
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error'
    const errorStack = error.stack || ''
    console.error(`\n❌ Error: ${errorMessage}`)
    
    // Log error to file
    logError(error, 'Main execution flow', 'main()')
    
    process.exit(1)
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error)
  logError(error, 'Main execution', 'main()')
  process.exit(1)
})
