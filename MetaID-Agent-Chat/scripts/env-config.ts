#!/usr/bin/env node

/**
 * 环境变量与配置初始化
 * - 从 .env / .env.local 加载配置
 * - 缺失时自动生成 .env.example、userInfo.json、config.json 模板
 * - 校验必填字段，未填写时提示用户
 */

import * as fs from 'fs'
import * as path from 'path'

// 根目录（MetaApp-Skill），与 account.json 同级
const ROOT_DIR = path.join(__dirname, '..', '..')
const ENV_FILE = path.join(ROOT_DIR, '.env')
const ENV_LOCAL_FILE = path.join(ROOT_DIR, '.env.local')
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example')
const CONFIG_FILE = path.join(ROOT_DIR, 'config.json')
const USER_INFO_FILE = path.join(ROOT_DIR, 'userInfo.json')

export interface EnvConfig {
  GROUP_ID: string
  GROUP_NAME: string
  GROUP_ANNOUNCEMENT: string
  GROUP_LAST_INDEX: string
  LLM_PROVIDER: string
  LLM_API_KEY: string
  LLM_BASE_URL: string
  LLM_MODEL: string
  LLM_TEMPERATURE: string
  LLM_MAX_TOKENS: string
}

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!fs.existsSync(filePath)) return result
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=')
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim()
          let val = trimmed.slice(eq + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          result[key] = val
        }
      }
    }
  } catch {
    // ignore
  }
  return result
}

/**
 * 加载 .env 和 .env.local（.env.local 优先）
 */
function loadEnv(): Record<string, string> {
  const env = parseEnvFile(ENV_FILE)
  const local = parseEnvFile(ENV_LOCAL_FILE)
  const proc: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) proc[k] = v
  }
  return { ...env, ...local, ...proc }
}

/**
 * 创建 .env.example 模板
 */
function createEnvExample(): void {
  const content = `# MetaID-Agent-Chat  configuration
# 复制此文件为 .env 或 .env.local，然后填写实际值

# 群聊配置
GROUP_ID=your-group-id
GROUP_NAME=群聊名称
GROUP_ANNOUNCEMENT=群公告

# 消息索引（运行时自动更新，可不填）
GROUP_LAST_INDEX=0

# LLM 配置（必填其一）
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=DeepSeek-V3.2
LLM_TEMPERATURE=0.8
LLM_MAX_TOKENS=500
`
  fs.writeFileSync(ENV_EXAMPLE_FILE, content, 'utf-8')
}

/**
 * 创建 userInfo.json 模板
 */
function createUserInfoTemplate(): void {
  const template = {
    userList: [
      {
        address: '',
        globalmetaid: '',
        metaid: '',
        userName: '',
        groupList: [''],
        character: '',
        preference: '',
        goal: '',
        masteringLanguages: [] as string[],
        stanceTendency: '',
        debateStyle: '',
        interactionStyle: '',
      },
    ],
  }
  fs.writeFileSync(USER_INFO_FILE, JSON.stringify(template, null, 2), 'utf-8')
}

/**
 * 从 env 构建 config 对象（用于写入 config.json）
 */
export function configFromEnv(env: Record<string, string>): object {
  const grouplastIndex = parseInt(env.GROUP_LAST_INDEX || '0', 10) || 0
  return {
    groupId: env.GROUP_ID || '',
    groupName: env.GROUP_NAME || '',
    groupAnnouncement: env.GROUP_ANNOUNCEMENT || '',
    grouplastIndex: isNaN(grouplastIndex) ? 0 : grouplastIndex,
    llm: {
      provider: env.LLM_PROVIDER || 'deepseek',
      apiKey: env.LLM_API_KEY || env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || env.CLAUDE_API_KEY || '',
      baseUrl: env.LLM_BASE_URL || 'https://api.deepseek.com',
      model: env.LLM_MODEL || 'DeepSeek-V3.2',
      temperature: parseFloat(env.LLM_TEMPERATURE || '0.8') || 0.8,
      maxTokens: parseInt(env.LLM_MAX_TOKENS || '500', 10) || 500,
    },
  }
}

/**
 * 创建 config.json（从 env 写入，不包含敏感 apiKey）
 */
function createConfigFromEnv(env: Record<string, string>): void {
  const config = configFromEnv(env)
  // 写入时不包含 llm.apiKey，运行时从 env 读取
  const safeConfig = { ...config } as any
  if (safeConfig.llm) {
    safeConfig.llm = { ...safeConfig.llm, apiKey: '' }
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(safeConfig, null, 2), 'utf-8')
}

/**
 * 校验必填字段，缺失时打印提示并退出
 * GROUP_ID 必填（可从 .env 或已迁移的 config.json 获取）；LLM API Key 在使用 LLM 的脚本中单独校验
 */
function validateAndExit(env: Record<string, string>): void {
  const errors: string[] = []

  let groupId = env.GROUP_ID || ''
  if ((!groupId || groupId === 'your-group-id') && fs.existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
      groupId = cfg.groupId || ''
    } catch {
      /* ignore */
    }
  }
  if (!groupId || groupId === 'your-group-id') {
    errors.push('GROUP_ID: 群聊 ID 不能为空，请在 .env 或 .env.local 中填写')
  }

  if (errors.length > 0) {
    console.error('\n❌ 配置校验失败，请填写以下必填项后再执行：\n')
    errors.forEach((e) => console.error('   • ' + e))
    console.error('\n   请复制 .env.example 为 .env 或 .env.local，并填写实际值。')
    console.error('   参考: MetaID-Agent-Chat/SKILL.md 中的「配置与敏感文件」章节\n')
    process.exit(1)
  }
}

/** 旧路径：MetaID-Agent-Chat 目录下 */
const OLD_METAID_CHAT_DIR = path.join(__dirname, '..')
const OLD_ENV_FILE = path.join(OLD_METAID_CHAT_DIR, '.env')
const OLD_ENV_LOCAL_FILE = path.join(OLD_METAID_CHAT_DIR, '.env.local')
const OLD_CONFIG_FILE = path.join(OLD_METAID_CHAT_DIR, 'config.json')
const OLD_USER_INFO_FILE = path.join(OLD_METAID_CHAT_DIR, 'userInfo.json')
const OLD_ENV_EXAMPLE_FILE = path.join(OLD_METAID_CHAT_DIR, '.env.example')

/**
 * 迁移：若旧位置存在且根目录不存在，则复制到根目录
 */
function migrateFromOldLocations(): void {
  const pairs: [string, string][] = [
    [OLD_ENV_FILE, ENV_FILE],
    [OLD_ENV_LOCAL_FILE, ENV_LOCAL_FILE],
    [OLD_CONFIG_FILE, CONFIG_FILE],
    [OLD_USER_INFO_FILE, USER_INFO_FILE],
    [OLD_ENV_EXAMPLE_FILE, ENV_EXAMPLE_FILE],
  ]
  for (const [oldPath, newPath] of pairs) {
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      try {
        fs.copyFileSync(oldPath, newPath)
        console.log(`📦 已迁移: ${path.basename(oldPath)} → 根目录`)
      } catch (e) {
        console.warn(`⚠️ 迁移失败 ${oldPath}:`, (e as Error).message)
      }
    }
  }
}

/**
 * 确保所有必要文件存在，缺失时自动创建
 * 若 .env 和 .env.local 均不存在，创建 .env.example 并提示用户
 * @returns 是否通过了校验（未通过会 process.exit）
 */
export function ensureConfigFiles(): void {
  migrateFromOldLocations()

  const envExists = fs.existsSync(ENV_FILE)
  const envLocalExists = fs.existsSync(ENV_LOCAL_FILE)

  if (!envExists && !envLocalExists) {
    createEnvExample()
    console.error('\n❌ 未找到 .env 或 .env.local 文件（根目录）')
    console.error('   已自动创建根目录 .env.example，请复制为 .env 或 .env.local 后填写配置：')
    console.error('   cp .env.example .env')
    console.error('\n   必填项：GROUP_ID、LLM_API_KEY（或 DEEPSEEK_API_KEY 等）')
    console.error('   参考: MetaID-Agent-Chat/SKILL.md（配置文件位于项目根目录）\n')
    process.exit(1)
  }

  const env = loadEnv()

  if (!fs.existsSync(USER_INFO_FILE)) {
    createUserInfoTemplate()
    console.log('📄 已自动创建 userInfo.json 模板（根目录），请根据 account.json 填写 userList')
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    createConfigFromEnv(env)
    console.log('📄 已从 .env 创建 config.json（根目录）')
  }

  validateAndExit(env)
}

/**
 * 获取当前 env（用于 llm 等模块）
 */
export function getEnv(): Record<string, string> {
  return loadEnv()
}
