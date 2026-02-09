#!/usr/bin/env node

import * as path from 'path'
import { joinChannel } from './message'
import { readConfig, addGroupToUser, hasJoinedGroup, findAccountByUsername } from './utils'

// Import createPin from MetaID-Agent skill (cross-skill call)
let createPin: any = null
try {
  const metaidAgentPath = path.join(__dirname, '..', '..', 'MetaID-Agent', 'scripts', 'metaid')
  const metaidModule = require(metaidAgentPath)
  createPin = metaidModule.createPin
  if (!createPin) {
    throw new Error('createPin not found in MetaID-Agent')
  }
} catch (error) {
  console.error('❌ Failed to load MetaID-Agent skill:', error)
  console.error('Please ensure MetaID-Agent skill is available at ../MetaID-Agent/')
  process.exit(1)
}

async function joinGroup() {
  const args = process.argv.slice(2)
  const address = args[0] || '19vUPMweuiFeX9ipFPVYw1SApAZB9wHxoo'
  
  try {
    // Read configuration
    const config = readConfig()
    if (!config.groupId) {
      console.error('❌ groupId is not configured in config.json')
      process.exit(1)
    }

    // Find account by address
    let account = findAccountByUsername('AI Eason')
    if (!account || account.mvcAddress !== address) {
      // Try to find by address directly
      const accountData = require('../../account.json')
      const foundAccount = accountData.accountList.find((acc: any) => acc.mvcAddress === address)
      if (!foundAccount) {
        console.error(`❌ Account not found for address: ${address}`)
        process.exit(1)
      }
      account = {
        mnemonic: foundAccount.mnemonic,
        mvcAddress: foundAccount.mvcAddress,
        userName: foundAccount.userName,
        globalMetaId: foundAccount.globalMetaId
      }
    }

    console.log(`🤖 Found agent: ${account.userName} (${account.mvcAddress})`)

    // Check if user has joined the group
    if (hasJoinedGroup(account.mvcAddress, config.groupId)) {
      console.log('✅ Already joined the group')
      return
    }

    // Join group
    console.log('📥 Joining group...')
    try {
      const joinResult = await joinChannel(
        config.groupId,
        account.mnemonic,
        createPin
      )
      
      if (joinResult.txids && joinResult.txids.length > 0) {
        console.log(`✅ Joined group successfully!`)
        console.log(`   TXID: ${joinResult.txids[0]}`)
        console.log(`   Cost: ${joinResult.totalCost} satoshis`)
        
        // Update userInfo.json
        addGroupToUser(
          account.mvcAddress,
          account.userName,
          config.groupId,
          account.globalMetaId
        )
        console.log('✅ User info updated')
      } else {
        throw new Error('No txids returned')
      }
    } catch (error: any) {
      console.error('❌ Failed to join group:', error.message)
      process.exit(1)
    }

    console.log('\n✅ All operations completed successfully!')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

joinGroup().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
