#!/usr/bin/env node

/**
 * Agent 任务委托场景 - 深夜群聊模式
 * 整合 agent.md 上下文，抽取成群聊话题，让所有 Agent 围绕「自然语言任务 → MCP 匹配 → 私聊沟通 → SPACE 支付 → 任务执行」全流程展开讨论
 * 参与者：2 反驳型 + 3 非反驳型 Agent
 * 
 * 
 */

import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { filterAgentsWithBalance } from './utils'

const REBUTTAL_AGENTS = ['小橙', 'Nova', '墨白']
const NORMAL_AGENTS = ['肥猪王', 'AI Eason', 'AI Bear', '大有益', 'Chloé', 'Satō']

/** agent.md 整合摘要 - 群聊话题 */
const AGENT_TOPIC_SUMMARY = `【深夜群聊议题】如何在 MetaWeb 上实现 Agent 任务委托与链上支付全流程？

**场景摘要：**
用户或 Agent 通过自然语言下达任务 → 通过 MCP 接口获取匹配本次任务的链上 Agent 分身（如任务「编写 XX 前端网站」则返回有编写代码技能的 Agent 列表）→ 甲方 Agent 决策选中乙方 → 私聊沟通任务详情 → 乙方通过 SKILLS 报价（如 1 SPACE）→ 甲方构造 rawTx 并发送给乙方 → 乙方通过 MCP 验证 rawTx（p2pkh 输出是否为乙方地址、金额是否符合）→ 验证通过后乙方广播交易完成支付 → 广播成功后乙方执行任务 → 任务完成后私聊将结果发送给甲方。

**前置技术背景：**
1. Agent 已有私聊能力
2. 已有验证交易脚本的 MCP 能力
3. 已有寻找合适 Agent 接受任务的 MCP 能力
4. MetaWeb 白皮书可转为文本供 Agent 理解
5. 目标：用户发任务 → Agent 分身自主整合资源完成任务

**讨论要点：**
请结合自身设定，围绕上述场景讨论：实现可行性、具体实现步骤、架构设计方案、可能的技术难点与解决方案。每人最多发表 6 次见解，畅所欲言。`

const METAWEB_CONTEXT = `MetaWeb 白皮书核心要点：
- 基于 BIWChain 区块链操作系统的元宇宙公链，构建 Web3.0 可信数字价值交互网络
- 移动端区块链：支持 Android、iOS、Windows 等终端直接连接链
- 分布式数字身份（DID）：用户自主掌控身份
- RSD 关系对象存储与多维分片：解决移动端存储与吞吐限制
- 跨链互操作、DeFi 与 DPFi
- 核心理念：真正的去中心化需用户直接参与链网络`

async function extractPdfText(pdfPath: string): Promise<string | null> {
  try {
    const pdftotext = spawn('pdftotext', [pdfPath, '-'])
    let text = ''
    pdftotext.stdout?.on('data', (chunk: Buffer) => { text += chunk })
    await new Promise<void>((resolve, reject) => {
      pdftotext.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pdftotext exit ${code}`))))
      pdftotext.on('error', reject)
    })
    return text.trim() || null
  } catch {
    return null
  }
}

async function getTopicWithContext(): Promise<string> {
  const pdfPath = path.join(__dirname, '..', 'references', 'MetaWeb_Whitepaper.pdf')
  if (fs.existsSync(pdfPath)) {
    const pdfText = await extractPdfText(pdfPath)
    if (pdfText && pdfText.length > 500) {
      const excerpt = pdfText.slice(0, 3000) + (pdfText.length > 3000 ? '...' : '')
      return `${AGENT_TOPIC_SUMMARY}\n\n【MetaWeb 白皮书摘录（供参考）】\n${excerpt}`
    }
  }
  return `${AGENT_TOPIC_SUMMARY}\n\n【MetaWeb 白皮书核心要点】\n${METAWEB_CONTEXT}`
}

async function main() {
  console.log('🌙 Agent 任务委托场景 - 深夜群聊模式\n')
  console.log('   议题: 自然语言任务 → MCP 匹配 Agent → 私聊沟通 → SPACE 支付 → 任务执行\n')

  const rebuttalWithBalance = await filterAgentsWithBalance(REBUTTAL_AGENTS)
  const normalWithBalance = await filterAgentsWithBalance(NORMAL_AGENTS)

  const selectedRebuttal = rebuttalWithBalance.sort(() => Math.random() - 0.5).slice(0, 2)
  const selectedNormal = normalWithBalance.sort(() => Math.random() - 0.5).slice(0, 3)
  const agents = [...selectedRebuttal, ...selectedNormal]

  if (agents.length === 0) {
    console.log('ℹ️  无 Agent 余额充足，讨论任务跳过')
    process.exit(0)
  }

  console.log(`👥 参与者: 2反驳型[${selectedRebuttal.join('、')}] + 3非反驳型[${selectedNormal.join('、')}]\n`)

  const topic = await getTopicWithContext()
  const topicAnnouncer = selectedNormal[0] || agents[0]

  const env = {
    ...process.env,
    METAWEB_TOPIC: topic,
    METAWEB_AGENTS: agents.join(','),
    METAWEB_TARGET_MESSAGES: '6',
    METAWEB_ANNOUNCER: topicAnnouncer,
  }

  const child = spawn('npx', ['ts-node', 'scripts/discussion.ts'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env,
  })

  child.on('close', (code) => {
    process.exit(code ?? 0)
  })
  child.on('error', (err) => {
    console.error('❌ 启动讨论失败:', err)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
