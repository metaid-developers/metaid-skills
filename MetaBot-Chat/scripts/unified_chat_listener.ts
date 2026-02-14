#!/usr/bin/env node

/**
 * 统一聊天监听（群聊 + 私聊）
 * - 使用 Socket.IO 连接 idchat.io 接收推送
 * - 群聊/私聊消息写入根目录 chat-history 下对应 .log
 * - 配置写入根目录 chat-config.json
 * - 支持启动时拉取最新 30 条、收到推送时去重追加，保留最近 300 条
 * - 可选自动回复：AUTO_REPLY=1 时对新消息回复，REPLY_MAX_COUNT 默认 20 次
 */

import * as path from 'path'
import { spawn } from 'child_process'
import { SocketIOClient } from './socket'
import {
  readChatConfig,
  writeChatConfig,
  ensureChatConfigAndDir,
  getGroupLogPath,
  getPrivateLogPath,
  appendToHistoryLog,
  historyLogHasPinId,
  type ChatConfig,
  type HistoryLogEntry,
} from './chat-config'
import { isPrivateChatMessage, isGroupChatMessage, type UnifiedChatMessage } from './unified-chat-types'
import { decrypt } from './crypto'
import { ecdhDecrypt } from './crypto'
import {
  getChannelInfo,
  getChannelNewestMessagesByStartTime,
  getChannelNewestMessages,
  getPrivateNewestMessagesByStartTime,
  getPrivateNewestMessagesByStartIndex,
  computeDecryptedMsg,
  type ChatMessageItem,
} from './chat'
import { findAccountByUsername } from './utils'

const ROOT_DIR = path.join(__dirname, '..', '..')
const ACCOUNT_FILE = path.join(ROOT_DIR, 'account.json')

let getEcdhPublickey: (mnemonic: string, pubkey?: string, options?: { addressIndex?: number }) => Promise<{ sharedSecret: string } | null>
let getUserInfoByMetaidByMs: (metaid: string) => Promise<{ chatPublicKey?: string }>
try {
  const chatpubkey = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'chatpubkey'))
  getEcdhPublickey = chatpubkey.getEcdhPublickey
} catch {
  getEcdhPublickey = async () => null
}
try {
  const api = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'api'))
  getUserInfoByMetaidByMs = api.getUserInfoByMetaidByMs
} catch {
  getUserInfoByMetaidByMs = async () => ({})
}

function getAccountWithPath(agentName: string): { mnemonic: string; globalMetaId: string; metaId?: string; addressIndex: number } | null {
  try {
    const fs = require('fs')
    if (!fs.existsSync(ACCOUNT_FILE)) return null
    const data = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8'))
    const account = (data.accountList || []).find(
      (a: any) => a.userName && a.userName.trim().toLowerCase() === agentName.trim().toLowerCase()
    )
    if (!account?.mnemonic) return null
    const pathStr = account.path || "m/44'/10001'/0'/0/0"
    const wallet = require(path.join(__dirname, '..', '..', 'MetaBot-Basic', 'scripts', 'wallet'))
    const addressIndex = wallet.parseAddressIndexFromPath ? wallet.parseAddressIndexFromPath(pathStr) : 0
    return {
      mnemonic: account.mnemonic,
      globalMetaId: account.globalMetaId || '',
      metaId: account.metaId,
      addressIndex,
    }
  } catch {
    return null
  }
}

function toHistoryEntry(
  msg: { txId: string; pinId?: string; address: string; userInfo: any; protocol: string; content: string; contentType: string; encryption: string; chatType: number; replyTx?: string; replyInfo?: any; mention?: string[]; index?: number; chain: string; timestamp: number; globalMetaId?: string; metaId?: string; groupId?: string },
  otherGlobalMetaId?: string
): HistoryLogEntry {
  return {
    groupId: msg.groupId,
    globalMetaId: msg.globalMetaId || msg.metaId || '',
    txId: msg.txId,
    pinId: msg.pinId,
    address: msg.address,
    userInfo: msg.userInfo,
    protocol: msg.protocol,
    content: msg.content,
    contentType: msg.contentType,
    encryption: msg.encryption,
    chatType: msg.chatType,
    replyPin: msg.replyTx || '',
    replyInfo: msg.replyInfo,
    mention: msg.mention || [],
    index: msg.index ?? 0,
    chain: msg.chain,
    timestamp: msg.timestamp,
    otherGlobalMetaId,
  }
}

async function syncGroupOnStart(config: ChatConfig): Promise<void> {
  for (const item of config.group) {
    const groupId = item.groupId
    if (!groupId) continue
    try {
      const groupInfo = await getChannelInfo({ groupId })
      const startTs = item.lastTimestamp || groupInfo.roomNewestTimestamp || 0
      const res = await getChannelNewestMessagesByStartTime({
        groupId,
        startTimestamp: startTs,
        size: 30,
      })
      if (!res.list?.length) continue
      const secretKeyStr = groupId.substring(0, 16)
      const entries: HistoryLogEntry[] = res.list
        .filter((m) => m.chatType === 0)
        .map((m) => {
          const content = computeDecryptedMsg(m, secretKeyStr)
          return toHistoryEntry({ ...m, content }, undefined)
        })
      if (entries.length > 0) {
        appendToHistoryLog(getGroupLogPath(groupId), entries)
        const last = res.list[res.list.length - 1]
        item.lastTimestamp = res.lastTimestamp ?? last?.timestamp ?? item.lastTimestamp
        item.lastIndex = last?.index ?? item.lastIndex
      }
    } catch (e) {
      console.error('syncGroupOnStart error', groupId, (e as Error).message)
    }
  }
  writeChatConfig(config)
}

async function syncPrivateOnStart(
  config: ChatConfig,
  mnemonic: string,
  addressIndex: number,
  selfGlobalMetaId: string
): Promise<void> {
  for (const item of config.private) {
    const { metaId, otherGlobalMetaId, otherMetaId, lastTimestamp } = item
    try {
      const res = await getPrivateNewestMessagesByStartTime({
        metaId: metaId || selfGlobalMetaId,
        otherMetaId: otherGlobalMetaId,
        timestamp: lastTimestamp || 0,
        size: 30,
      })
      if (!res.list?.length) continue
      let otherUserInfo: { chatPublicKey?: string }
      try {
        otherUserInfo = await getUserInfoByMetaidByMs(otherMetaId || otherGlobalMetaId)
      } catch {
        console.warn('getUserInfoByMetaidByMs failed for', otherMetaId || otherGlobalMetaId)
        continue
      }
      if (!otherUserInfo?.chatPublicKey) continue
      const ecdh = await getEcdhPublickey(mnemonic, otherUserInfo.chatPublicKey, { addressIndex })
      if (!ecdh?.sharedSecret) {
        console.warn('getEcdhPublickey failed for private sync')
        continue
      }
      const sharedSecret = ecdh.sharedSecret
      const logPath = getPrivateLogPath(sharedSecret)
      const entries: HistoryLogEntry[] = res.list
        .filter((m) => m.chatType === 0)
        .map((m) => {
          let content = m.content
          try {
            content = ecdhDecrypt(m.content, sharedSecret)
          } catch {
            /* keep original */
          }
          return toHistoryEntry({ ...m, content }, otherGlobalMetaId)
        })
      if (entries.length > 0) {
        appendToHistoryLog(logPath, entries)
        item.lastTimestamp = res.nextTimestamp ?? item.lastTimestamp
        const last = res.list[res.list.length - 1]
        item.lastIndex = (last as any).index ?? item.lastIndex
      }
    } catch (e) {
      console.error('syncPrivateOnStart error', otherGlobalMetaId, (e as Error).message)
    }
  }
  writeChatConfig(config)
}

/** 启动时按 lastIndex 拉取最近 30 条（群聊 getChannelNewestMessages / 私聊 getPrivateNewestMessagesByStartIndex） */
async function pullLatest30Group(config: ChatConfig): Promise<void> {
  for (const item of config.group) {
    const groupId = item.groupId
    if (!groupId) continue
    try {
      const startIndex = Math.max(0, (item.lastIndex || 0) - 30)
      const res = await getChannelNewestMessages({
        groupId,
        size: 30,
        startIndex: String(startIndex),
      })
      if (!res.list?.length) continue
      const secretKeyStr = groupId.substring(0, 16)
      const entries: HistoryLogEntry[] = res.list
        .filter((m) => m.chatType === 0)
        .map((m) => {
          const content = computeDecryptedMsg(m, secretKeyStr)
          return toHistoryEntry({ ...m, content }, undefined)
        })
      appendToHistoryLog(getGroupLogPath(groupId), entries)
      const last = res.list[res.list.length - 1]
      item.lastTimestamp = (last as any).timestamp ?? item.lastTimestamp
      item.lastIndex = (last as any).index ?? item.lastIndex
    } catch (e) {
      console.error('pullLatest30Group error', groupId, (e as Error).message)
    }
  }
  writeChatConfig(config)
}

async function pullLatest30Private(
  config: ChatConfig,
  mnemonic: string,
  addressIndex: number,
  selfGlobalMetaId: string
): Promise<void> {
  for (const item of config.private) {
    try {
      const startIndex = Math.max(0, (item.lastIndex || 0) - 30)
      const res = await getPrivateNewestMessagesByStartIndex({
        metaId: item.metaId || selfGlobalMetaId,
        otherMetaId: item.otherGlobalMetaId,
        size: 30,
        startIndex,
      })
      if (!res.list?.length) continue
      const otherUserInfo = await getUserInfoByMetaidByMs(item.otherMetaId || item.otherGlobalMetaId)
      if (!otherUserInfo?.chatPublicKey) continue
      const ecdh = await getEcdhPublickey(mnemonic, otherUserInfo.chatPublicKey, { addressIndex })
      if (!ecdh?.sharedSecret) continue
      const logPath = getPrivateLogPath(ecdh.sharedSecret)
      const entries: HistoryLogEntry[] = res.list
        .filter((m) => m.chatType === 0)
        .map((m) => {
          let content = m.content
          try {
            content = ecdhDecrypt(m.content, ecdh.sharedSecret)
          } catch {
            /* keep */
          }
          return toHistoryEntry({ ...m, content }, item.otherGlobalMetaId)
        })
      appendToHistoryLog(logPath, entries)
      const last = res.list[res.list.length - 1]
      item.lastTimestamp = (res as any).nextTimestamp ?? item.lastTimestamp
      item.lastIndex = (last as any).index ?? item.lastIndex
    } catch (e) {
      console.error('pullLatest30Private error', (e as Error).message)
    }
  }
  writeChatConfig(config)
}

async function main() {
  const agentName = process.env.AGENT_NAME || process.argv[2] || ''
  const accountByUsername = agentName ? findAccountByUsername(agentName) : null
  const accountWithPath = agentName ? getAccountWithPath(agentName) : null
  if (!accountWithPath && !accountByUsername) {
    console.error('❌ 未找到账户，请设置 AGENT_NAME 或传入参数指定监听使用的 Agent')
    process.exit(1)
  }
  const mnemonic = accountWithPath?.mnemonic ?? (accountByUsername as any)?.mnemonic
  const selfGlobalMetaId = accountWithPath?.globalMetaId ?? (accountByUsername as any)?.globalMetaId
  const addressIndex = accountWithPath?.addressIndex ?? 0

  if (!selfGlobalMetaId) {
    console.error('❌ 账户缺少 globalMetaId，无法建立监听')
    process.exit(1)
  }

  ensureChatConfigAndDir()
  let config = readChatConfig()

  // 初始化：若有 group 配置，用 getChannelInfo 更新 lastTimestamp
  for (const item of config.group) {
    if (!item.groupId) continue
    try {
      const groupInfo = await getChannelInfo({ groupId: item.groupId })
      if (item.lastTimestamp === 0) {
        item.lastTimestamp = groupInfo.roomNewestTimestamp || 0
      }
    } catch {
      /* ignore */
    }
  }
  writeChatConfig(config)

  // 拉取最新 30 条（群 + 私）
  if (config.group.length > 0) {
    await pullLatest30Group(config)
    config = readChatConfig()
  }
  if (config.private.length > 0) {
    await pullLatest30Private(config, mnemonic, addressIndex, selfGlobalMetaId)
    config = readChatConfig()
  }

  // 启动时再同步一次（按 startTime / startIndex 的拉取已在上面）
  await syncGroupOnStart(config)
  config = readChatConfig()
  await syncPrivateOnStart(config, mnemonic, addressIndex, selfGlobalMetaId)
  config = readChatConfig()

  const REPLY_MAX = parseInt(process.env.REPLY_MAX_COUNT || '20', 10) || 20
  let replyCount = 0
  const maybeTriggerReply = (kind: 'group' | 'private', groupId?: string, otherGlobalMetaId?: string) => {
    if (process.env.AUTO_REPLY !== '1' && process.env.AUTO_REPLY !== 'true') return
    if (replyCount >= REPLY_MAX) {
      if (replyCount === REPLY_MAX) {
        console.log(`\n⚠️ 自动回复策略 ${REPLY_MAX} 次已完成，如需继续请输入相关指令或重新设置 REPLY_MAX_COUNT。\n`)
        replyCount++
      }
      return
    }
    replyCount++
    const cwd = path.join(__dirname, '..')
    const env: Record<string, string | undefined> = { ...process.env, AGENT_NAME: agentName }
    if (kind === 'group' && groupId) {
      env.GROUP_ID = groupId
      const child = spawn('npx', ['ts-node', 'scripts/chat_reply.ts'], { cwd, env, stdio: 'inherit', shell: true })
      child.on('error', (e) => console.error('chat_reply 启动失败:', (e as Error).message))
    } else if (kind === 'private' && otherGlobalMetaId) {
      env.OTHER_GLOBAL_META_ID = otherGlobalMetaId
      const child = spawn('npx', ['ts-node', 'scripts/private_reply.ts'], { cwd, env, stdio: 'inherit', shell: true })
      child.on('error', (e) => console.error('private_reply 启动失败:', (e as Error).message))
    }
  }

  const addMessage = async (message: UnifiedChatMessage) => {
    const isPrivate = isPrivateChatMessage(message)
    if (isPrivate) {
      console.log('[addMessage 私聊] 开始处理私聊消息')
      const fromUserInfo = message.fromUserInfo
      if (!fromUserInfo?.chatPublicKey) {
        console.warn('[addMessage 私聊] 缺少 fromUserInfo.chatPublicKey，跳过')
        return
      }
      const ecdh = await getEcdhPublickey(mnemonic, fromUserInfo.chatPublicKey, { addressIndex })
      if (!ecdh) {
        console.warn('[addMessage 私聊] 协商密钥获取失败，跳过')
        return
      }
      const sharedSecret = ecdh.sharedSecret
      const logPath = getPrivateLogPath(sharedSecret)
      const pinId = message.pinId || message.txId + 'i0'
      const isDup = historyLogHasPinId(logPath, pinId)
      console.log('[addMessage 私聊] pinId:', pinId, 'logPath:', logPath, 'historyLogHasPinId:', isDup)
      if (isDup) {
        console.log('[addMessage 私聊] 重复消息，跳过（不会执行 writeChatConfig）')
        return
      }
      let content = message.content
      if (message.chatType === 0) {
        try {
          content = ecdhDecrypt(message.content, sharedSecret)
        } catch {
          /* keep */
        }
      }
      const entry = toHistoryEntry(
        {
          ...message,
          content,
          replyTx: (message as any).replyPin,
        } as any,
        message.toGlobalMetaId === selfGlobalMetaId ? message.fromGlobalMetaId : message.toGlobalMetaId
      )
      try {
        appendToHistoryLog(logPath, [entry])
      } catch (e) {
        console.error('[addMessage 私聊] appendToHistoryLog 异常:', (e as Error).message)
        return
      }

      const otherGlobalMetaId = message.toGlobalMetaId === selfGlobalMetaId ? message.fromGlobalMetaId : message.toGlobalMetaId
      const otherMetaId = (message.fromUserInfo as any)?.metaid || (message.fromUserInfo as any)?.globalMetaId || otherGlobalMetaId
      const existing = config.private.find((p) => p.sharedSecret === sharedSecret)
      const secretPrefix = sharedSecret.slice(0, 8)
      console.log('[addMessage 私聊] config.private.length:', config.private.length, '当前 sharedSecret 前缀:', secretPrefix, 'existing:', !!existing)
      if (!existing && config.private.length > 0) {
        const existingPrefixes = config.private.map((p) => p.sharedSecret?.slice(0, 8) || '(空)')
        console.log('[addMessage 私聊] 已有 private 项的 sharedSecret 前缀:', existingPrefixes, '(find 用 === 严格匹配，若前缀不同则不会命中)')
      }
      if (existing) {
        existing.lastTimestamp = message.timestamp
        existing.lastIndex = message.index ?? existing.lastIndex
        console.log('[addMessage 私聊] 更新已有配置，即将 writeChatConfig')
      } else {
        config.private.push({
          sharedSecret,
          metaId: selfGlobalMetaId,
          otherGlobalMetaId: otherGlobalMetaId || '',
          otherMetaId: otherMetaId || '',
          lastTimestamp: message.timestamp,
          lastIndex: message.index ?? 0,
        })
        console.log('[addMessage 私聊] 新增 private 配置，config.private.length 现为:', config.private.length, '即将 writeChatConfig')
      }
      try {
        writeChatConfig(config)
        console.log('[addMessage 私聊] writeChatConfig 已执行')
      } catch (e) {
        console.error('[addMessage 私聊] writeChatConfig 异常:', (e as Error).message)
      }
      console.log(`[Socket 推送] 📩 私聊 [${(fromUserInfo as any)?.name || otherGlobalMetaId}]: ${content.slice(0, 50)}`)
      maybeTriggerReply('private', undefined, otherGlobalMetaId)
    } else if (isGroupChatMessage(message)) {
      const groupId = message.groupId!
      if (message.chatType !== 0) return
      const secretKeyStr = groupId.substring(0, 16)
      const logPath = getGroupLogPath(groupId)
      const pinId = message.pinId || message.txId + 'i0'
      if (historyLogHasPinId(logPath, pinId)) return
      let content = message.content
      try {
        content = decrypt(message.content, secretKeyStr)
      } catch {
        /* keep */
      }
      const entry = toHistoryEntry({ ...message, content, replyTx: (message as any).replyPin } as any)
      appendToHistoryLog(logPath, [entry])

      const groupItem = config.group.find((g) => g.groupId === groupId)
      if (groupItem) {
        groupItem.lastTimestamp = message.timestamp
        groupItem.lastIndex = message.index ?? groupItem.lastIndex
      } else {
        config.group.push({
          groupId,
          lastTimestamp: message.timestamp,
          lastIndex: message.index ?? 0,
        })
      }
      writeChatConfig(config)
      console.log(`[Socket 推送] 📩 群聊 [${groupId.slice(0, 8)}…] ${(message.userInfo as any)?.name || message.address}: ${content.slice(0, 50)}`)
      maybeTriggerReply('group', groupId)
    }
  }

  const handleReceivedMessage = (data: { message?: string; [k: string]: any }) => {
    const raw = typeof data.message === 'string' ? data.message : JSON.stringify(data)
    let wrapper: { M?: string; D?: UnifiedChatMessage }
    try {
      wrapper = JSON.parse(raw)
    } catch {
      return
    }
    switch (wrapper.M) {
      case 'WS_SERVER_NOTIFY_GROUP_CHAT':
        if (wrapper.D) {
          console.log('[Socket 推送] 收到群聊消息')
          addMessage(wrapper.D as UnifiedChatMessage)
        }
        break
      case 'WS_SERVER_NOTIFY_PRIVATE_CHAT':
        if (wrapper.D) {
          console.log('[Socket 推送] 收到私聊消息')
          addMessage(wrapper.D as UnifiedChatMessage)
        }
        break
      default:
        break
    }
  }

  const SOCKET_URL = 'https://api.idchat.io'
  const SOCKET_PATH = '/socket/socket.io'
  const client = new SocketIOClient(
    {
      url: SOCKET_URL,
      path: SOCKET_PATH,
      metaid: selfGlobalMetaId,
      type: 'pc',
    },
    handleReceivedMessage
  )

  console.log('\n✅ 监听已启动（群聊 + 私聊）')
  console.log('   当前账户:', agentName || '默认', 'globalMetaId:', selfGlobalMetaId.slice(0, 16) + '…')
  console.log('   Socket 连接 URL:', SOCKET_URL + SOCKET_PATH)
  console.log('   日志目录: 根目录 chat-history/')
  console.log('   配置: 根目录 chat-config.json')
  console.log('   收到推送时将打印 [Socket 推送] 日志，按 Ctrl+C 停止\n')

  client.connect()

  process.on('SIGINT', () => {
    client.disconnect()
    process.exit(0)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
