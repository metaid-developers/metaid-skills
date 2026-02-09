#!/usr/bin/env node

/**
 * Batch create MetaID Agents
 */

import * as path from 'path'
import { generateMnemonic, getAllAddress, getPublicKey, getPath, getUtxos, getCredential } from './wallet'
import { getMVCRewards, getMVCInitRewards, sleep, getUserInfoByAddressByMs } from './api'
import { createPin, CreatePinParams } from './metaid'
import {
  readAccountFile,
  writeAccountFile,
  ensureAccountFile,
  Account
} from './utils'

async function createAgent(username: string): Promise<void> {
  console.log(`\n🚀 开始创建 MetaID Agent: ${username}`)
  console.log('='.repeat(50))
  
  try {
    ensureAccountFile()
    let accountData = readAccountFile()
    
    // Create new wallet
    console.log('🔐 生成钱包...')
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

    // Add to account list (unshift to front)
    accountData.accountList.unshift(newAccount)
    writeAccountFile(accountData)
    console.log(`✅ 钱包创建成功`)
    console.log(`   MVC地址: ${addresses.mvcAddress}`)
    console.log(`   BTC地址: ${addresses.btcAddress}`)
    console.log(`   DOGE地址: ${addresses.dogeAddress}`)

    // Register MetaID
    console.log(`📝 注册 MetaID 账户...`)
    
    // Check if user has UTXOs
    const utxos = await getUtxos('mvc', mnemonic)
    
    if (utxos.length === 0) {
      // New user, claim gas subsidy
      console.log('💰 申请 Gas 补贴...')
      await getMVCRewards({
        address: addresses.mvcAddress,
        gasChain: 'mvc'
      })
      console.log('⏳ 等待补贴处理...')
      await sleep(5000) // Wait 5 seconds
      
      // Get credential for signing
      console.log('🔐 获取凭证用于初始奖励...')
      const sigRes = await getCredential({
        mnemonic: mnemonic,
        chain: 'btc',
        message: 'metaso.network'
      })
      
      // Call getMVCInitRewards
      console.log('💰 申请初始奖励...')
      await getMVCInitRewards({
        address: addresses.mvcAddress,
        gasChain: 'mvc'
      }, {
        'X-Signature': sigRes.signature,
        'X-Public-Key': sigRes.publicKey
      })
      console.log('✅ 初始奖励申请成功')
    }

    // Create MetaID node with username
    console.log(`🏷️  创建 MetaID 节点，用户名: ${username}`)
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

    const namePinRes = await createPin(namePinParams, mnemonic)
    
    if (namePinRes.txids && namePinRes.txids.length > 0) {
      console.log(`✅ MetaID 节点创建成功! TXID: ${namePinRes.txids[0]}`)
      
      // Wait a bit for the transaction to be indexed
      console.log('⏳ 等待交易索引...')
      await sleep(3000)
      
      // Fetch user info to get globalMetaId
      console.log('📋 获取用户信息以获取 globalMetaId...')
      const userInfo = await getUserInfoByAddressByMs(addresses.mvcAddress)
      if (userInfo && userInfo.globalMetaId) {
        // Update account
        const accountIndex = accountData.accountList.findIndex(acc => acc.mvcAddress === addresses.mvcAddress)
        if (accountIndex !== -1) {
          accountData.accountList[accountIndex].userName = username
          accountData.accountList[accountIndex].globalMetaId = userInfo.globalMetaId
          writeAccountFile(accountData)
          console.log(`✅ 获取到 globalMetaId: ${userInfo.globalMetaId}`)
        }
      } else {
        // Still update username even if globalMetaId is not available yet
        const accountIndex = accountData.accountList.findIndex(acc => acc.mvcAddress === addresses.mvcAddress)
        if (accountIndex !== -1) {
          accountData.accountList[accountIndex].userName = username
          writeAccountFile(accountData)
          console.log('⚠️  暂时无法获取 globalMetaId，但用户名已更新')
        }
      }
    } else {
      throw new Error('MetaID 节点创建失败')
    }
    
    console.log(`\n✅ ${username} 创建完成!`)
    console.log('='.repeat(50))
    
  } catch (error: any) {
    console.error(`\n❌ 创建 ${username} 时出错:`, error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const agents = args.length > 0 ? args : ['小橙', 'Nova', '墨白']
  
  console.log('🎯 开始批量创建 MetaID Agents')
  console.log(`📋 将创建以下 Agents: ${agents.join(', ')}`)
  
  for (const agentName of agents) {
    try {
      await createAgent(agentName)
      // Wait between creations to avoid rate limiting
      if (agentName !== agents[agents.length - 1]) {
        console.log('\n⏳ 等待 5 秒后创建下一个...')
        await sleep(5000)
      }
    } catch (error: any) {
      console.error(`\n❌ 创建 ${agentName} 失败:`, error.message)
      // Continue with next agent
    }
  }
  
  console.log('\n🎉 批量创建完成!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
