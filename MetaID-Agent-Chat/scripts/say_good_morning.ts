#!/usr/bin/env node

/**
 * 随机选取 3 个 Agent 在群里说早安
 * Usage: npx ts-node scripts/say_good_morning.ts
 */

import * as path from 'path'
import { sendTextForChat } from './message'
import {
  readConfig,
  findAccountByUsername,
  hasJoinedGroup,
  addGroupToUser,
  fetchAndUpdateGroupHistory,
  filterAgentsWithBalance,
} from './utils'
import { joinChannel } from './message'

const ALL_AGENTS = ['小橙', 'Nova', '墨白', '肥猪王', 'AI Eason', 'AI Bear', '大有益', 'Chloé', 'Satō']

let createPin: any = null
try {
  const metaidModule = require(path.join(__dirname, '..', '..', 'MetaID-Agent', 'scripts', 'metaid'))
  createPin = metaidModule.createPin
} catch (error) {
  console.error('❌ Failed to load MetaID-Agent:', error)
  process.exit(1)
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

async function main() {
  console.log('🌅 早安问候 - 随机选取 3 个 Agent 在群里说早安\n')

  const config = readConfig()
  if (!config.groupId) {
    console.error('❌ groupId not configured')
    process.exit(1)
  }

  const agentsWithBalance = await filterAgentsWithBalance(ALL_AGENTS)
  if (agentsWithBalance.length < 3) {
    console.log(`⚠️ 余额充足的 Agent 仅 ${agentsWithBalance.length} 个，将全部参与`)
  }

  const selected = pickRandom(agentsWithBalance, 3)
  if (selected.length === 0) {
    console.log('ℹ️  无 Agent 余额充足，任务跳过')
    process.exit(0)
  }

  console.log(`👥 本次说早安的 Agent: ${selected.join('、')}\n`)

  const secretKeyStr = config.groupId.substring(0, 16)

  for (const agentName of selected) {
    const account = findAccountByUsername(agentName)
    if (!account) {
      console.log(`⚠️ 跳过 ${agentName}: 未找到账户`)
      continue
    }

    if (!hasJoinedGroup(account.mvcAddress, config.groupId)) {
      console.log(`📥 ${agentName} 正在加群...`)
      try {
        const joinResult = await joinChannel(config.groupId, account.mnemonic, createPin)
        if (joinResult.txids?.length) {
          addGroupToUser(account.mvcAddress, account.userName, config.groupId, account.globalMetaId)
          console.log(`✅ ${agentName} 加群成功`)
        }
      } catch (e: any) {
        console.log(`⚠️ ${agentName} 加群失败: ${e?.message || e}`)
        continue
      }
      await new Promise((r) => setTimeout(r, 2000))
    }

    try {
      const result = await sendTextForChat(
        config.groupId,
        '早安',
        0,
        secretKeyStr,
        null,
        [],
        account.userName,
        account.mnemonic,
        createPin
      )
      if (result.txids?.length) {
        console.log(`✅ ${agentName}: 早安 已发送 (TXID: ${result.txids[0]})`)
        await fetchAndUpdateGroupHistory(config.groupId, secretKeyStr)
      } else {
        console.log(`⚠️ ${agentName} 发送失败，可能余额不足`)
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('balance') || msg.includes('insufficient') || msg.includes('余额')) {
        console.log(`⚠️ ${agentName} 余额不足，发送失败`)
      } else {
        console.log(`⚠️ ${agentName} 发送失败: ${msg}`)
      }
    }

    // 间隔 3-6 秒再发下一条，避免过于密集
    if (selected.indexOf(agentName) < selected.length - 1) {
      const delay = 3000 + Math.random() * 3000
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  console.log('\n✅ 早安问候完成')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
