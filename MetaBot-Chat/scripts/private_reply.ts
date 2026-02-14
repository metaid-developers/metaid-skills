#!/usr/bin/env node

/**
 * 私聊智能回复：根据 chat-history 下对应私聊 log 最近记录生成一条回复并发送
 * 用法: AGENT_NAME=xxx OTHER_GLOBAL_META_ID=xxx npx ts-node scripts/private_reply.ts
 */

import * as path from 'path'
import { readChatConfig, getPrivateLogPath, getHistoryLogEntries } from './chat-config'
import { findAccountByUsername } from './utils'
import { generateChatReply, getResolvedLLMConfig } from './llm'
import { sendTextForPrivateChat } from './message'
import { readConfig } from './utils'

let createPin: any = null
let getEcdhPublickey: (mnemonic: string, pubkey?: string, options?: { addressIndex?: number }) => Promise<{ sharedSecret: string } | null>
let getUserInfoByMetaidByMs: (metaid: string) => Promise<{ chatPublicKey?: string }>
try {
  createPin = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'metaid')).createPin
  const chatpubkey = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'chatpubkey'))
  getEcdhPublickey = chatpubkey.getEcdhPublickey
  const api = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'api'))
  getUserInfoByMetaidByMs = api.getUserInfoByMetaidByMs
} catch (e) {
  console.error('加载 metabot-basic 失败:', (e as Error).message)
  process.exit(1)
}

async function main() {
  const agentName = process.env.AGENT_NAME || process.argv[2] || ''
  const otherGlobalMetaId = process.env.OTHER_GLOBAL_META_ID || process.argv[3] || ''
  if (!agentName || !otherGlobalMetaId) {
    console.error('用法: AGENT_NAME=xxx OTHER_GLOBAL_META_ID=xxx npx ts-node scripts/private_reply.ts')
    process.exit(1)
  }

  const config = readConfig()
  const chatConfig = readChatConfig()
  const privateItem = chatConfig.private.find(
    (p) => p.otherGlobalMetaId === otherGlobalMetaId || p.otherMetaId === otherGlobalMetaId
  )
  if (!privateItem?.sharedSecret) {
    console.error('未在 chat-config.json 的 private 中找到对方配置，请先收到对方一条私聊后再回复')
    process.exit(1)
  }

  const account = findAccountByUsername(agentName)
  if (!account?.mnemonic) {
    console.error('未找到账户:', agentName)
    process.exit(1)
  }

  const logPath = getPrivateLogPath(privateItem.sharedSecret)
  const entries = getHistoryLogEntries(logPath, 30)
  const recentMessages = entries.map((e) => `${(e.userInfo as any)?.name || '对方'}: ${e.content}`).filter(Boolean)
  if (recentMessages.length === 0) {
    console.log('暂无私聊记录，跳过回复')
    return
  }

  const llmConfig = getResolvedLLMConfig(account, config)
  if (!llmConfig.apiKey) {
    console.error('请配置 LLM API Key')
    process.exit(1)
  }

  const userProfile = {
    character: account.character || '友好',
    preference: account.preference || '广泛',
    goal: account.goal || '参与交流',
  }
  const result = await generateChatReply(
    agentName,
    recentMessages,
    userProfile,
    { hasMetaIDAgentMention: false },
    llmConfig
  )

  const sharedSecret = privateItem.sharedSecret
  try {
    await sendTextForPrivateChat(
      otherGlobalMetaId,
      result.content,
      0,
      sharedSecret,
      null,
      [],
      account.userName,
      account.mnemonic,
      createPin
    )
    console.log('✅ 私聊回复已发送')
  } catch (e: any) {
    console.error('发送失败:', e?.message || e)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
