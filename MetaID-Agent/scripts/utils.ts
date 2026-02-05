import * as fs from 'fs'
import * as path from 'path'

export interface Account {
  mnemonic: string
  mvcAddress: string
  btcAddress: string
  dogeAddress: string
  publicKey: string
  userName: string
  path: string
  globalMetaId?: string // 全局 MetaId，支持多链（MVC/BTC/DOGE）
}

export interface AccountData {
  accountList: Account[]
}

const ACCOUNT_FILE = path.join(__dirname, '..', 'account.json')

// Read account.json
export function readAccountFile(): AccountData {
  try {
    if (fs.existsSync(ACCOUNT_FILE)) {
      const content = fs.readFileSync(ACCOUNT_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Error reading account.json:', error)
  }
  return { accountList: [] }
}

// Write account.json
export function writeAccountFile(data: AccountData): void {
  try {
    // Filter out empty accounts (accounts with empty mnemonic)
    const filteredData: AccountData = {
      accountList: data.accountList.filter(account => 
        account.mnemonic && account.mnemonic.trim() !== ''
      )
    }
    fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(filteredData, null, 4), 'utf-8')
  } catch (error) {
    console.error('Error writing account.json:', error)
    throw error
  }
}

// Create account.json from template if it doesn't exist
export function ensureAccountFile(): void {
  if (!fs.existsSync(ACCOUNT_FILE)) {
    // Create empty account file (don't copy template with empty account)
    writeAccountFile({ accountList: [] })
  } else {
    // Clean up existing file: remove any empty accounts
    const existingData = readAccountFile()
    if (existingData.accountList.some(acc => !acc.mnemonic || acc.mnemonic.trim() === '')) {
      writeAccountFile(existingData) // This will filter out empty accounts
    }
  }
}

// Find account by username or address
export function findAccountByKeyword(keyword: string, accountData: AccountData): Account | null {
  if (!keyword) return null
  
  const lowerKeyword = keyword.toLowerCase()
  for (const account of accountData.accountList) {
    if (
      account.userName.toLowerCase().includes(lowerKeyword) ||
      account.mvcAddress.toLowerCase().includes(lowerKeyword) ||
      account.btcAddress.toLowerCase().includes(lowerKeyword) ||
      account.dogeAddress.toLowerCase().includes(lowerKeyword)
    ) {
      return account
    }
  }
  return null
}

// Log error to log/error.md
export function logError(error: Error, context: string, method?: string): void {
  const logFile = path.join(__dirname, '..', 'log', 'error.md')
  const timestamp = new Date().toISOString()
  const errorLog = `
## Error at ${timestamp}

**Context**: ${context}
${method ? `**Method**: ${method}` : ''}
**Error**: ${error.message}
**Stack**: 
\`\`\`
${error.stack}
\`\`\`

---

`
  
  try {
    fs.appendFileSync(logFile, errorLog, 'utf-8')
  } catch (err) {
    console.error('Failed to write error log:', err)
  }
}

// Parse user prompt for username
export function extractUsername(prompt: string): string | null {
  // Patterns: "名字叫'xxx'", "名字叫xxx", "name is xxx", "username: xxx"
  const patterns = [
    /名字叫['"]([^'"]+)['"]/i,
    /名字叫\s+([^\s,，。]+)/i,
    /name\s+is\s+['"]?([^'",，。\s]+)['"]?/i,
    /username[:\s]+['"]?([^'",，。\s]+)['"]?/i,
    /用户名[:\s]+['"]?([^'",，。\s]+)['"]?/i,
  ]
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

// Parse user prompt for buzz content
export function extractBuzzContent(prompt: string): string | null {
  // Patterns: "内容为'xxx'", "内容为xxx", "content is xxx", "发条信息，内容为xxx"
  const patterns = [
    /内容为['"]([^'"]+)['"]/i,
    /内容为\s+['"]?([^'",，。]+)['"]?/i,
    /content\s+is\s+['"]?([^'",，。]+)['"]?/i,
    /(?:发条|发送|发布)(?:信息|消息|buzz)[，,]?\s*(?:内容为|内容)?\s*['"]?([^'",，。]+)['"]?/i,
    /buzz\s+content[:\s]+['"]?([^'",，。]+)['"]?/i,
  ]
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

// Check if prompt indicates wallet creation
export function shouldCreateWallet(prompt: string): boolean {
  const createKeywords = [
    '创建一个',
    '创建',
    '新建',
    '生成',
    'create',
    'new',
    'generate'
  ]
  
  const agentKeywords = [
    'metaid agent',
    'metaid代理',
    'metaid机器人',
    '代理',
    '机器人',
    'agent',
    'robot',
    'proxy'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  const hasCreateKeyword = createKeywords.some(kw => lowerPrompt.includes(kw))
  const hasAgentKeyword = agentKeywords.some(kw => lowerPrompt.includes(kw))
  
  return hasCreateKeyword && hasAgentKeyword
}
