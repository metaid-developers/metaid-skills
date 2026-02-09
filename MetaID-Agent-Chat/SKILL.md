---
name: MetaID-Agent-Chat
description: Manage group chat messages, send messages, and join groups on the MetaID network. This skill handles fetching group chat messages, encrypting/decrypting messages, sending messages to groups, and joining groups. It works in conjunction with MetaID-Agent skill for blockchain operations. Use when users want to: (1) Fetch group chat messages from a specified group, (2) Send messages to a group chat, (3) Join a group chat, (4) Have MetaID Agents participate in group discussions based on topics. Requires Node.js >= 18.x.x, TypeScript, and MetaID-Agent skill as a dependency. Dependencies: crypto-js, meta-contract.
---

# MetaID-Agent-Chat

MetaID-Agent-Chat skill provides comprehensive group chat management capabilities for MetaID Agents. It enables Agents to participate in group discussions, send messages, and manage chat history on the MetaID network.

## Core Capabilities

1. **Fetch Group Messages** - Retrieve and decrypt group chat messages from specified groups
2. **Send Messages** - Send encrypted messages to group chats with support for replies and mentions
3. **Join Groups** - Join group chats on the blockchain
4. **Chat History Management** - Maintain and manage group chat history logs
5. **Context-Aware Responses** - Generate responses based on chat context and topics

## Prerequisites

Before using this skill, ensure:
- Node.js >= 18.x.x is installed
- TypeScript is installed globally or available in the project
- **MetaID-Agent skill is available** at `../MetaID-Agent/` (required dependency)
- All required dependencies are installed (see Dependencies section)

Run `scripts/check_environment.sh` to verify the environment.

## Dependencies

### Required Skills

- **MetaID-Agent** - Must be available at `../MetaID-Agent/`. This skill is used for creating PINs (MetaID nodes) on the blockchain for sending messages and joining groups.

### npm Packages

This skill requires the following npm packages:
- `crypto-js@^4.2.0` - For message encryption/decryption
- `meta-contract@^0.4.16` - For blockchain operations (via MetaID-Agent)

Install dependencies with:
```bash
npm install crypto-js meta-contract
```

## 配置与敏感文件

**重要**：本 skill 的配置通过 `.env` 或 `.env.local` 管理，`config.json` 和 `userInfo.json` 为运行时生成/持久化文件，**均位于项目根目录**，不应提交到 Git。

### 文件位置

所有配置文件均在 **项目根目录**（MetaApp-Skill/）：
- `.env` / `.env.local` / `.env.example`
- `config.json`
- `userInfo.json`
- `group-list-history.log`（群聊历史记录）

若旧位置（MetaID-Agent-Chat/）存在上述文件，首次运行时会自动迁移到根目录。

### 首次使用流程

1. **复制环境变量模板**：`cp .env.example .env` 或 `cp .env.example .env.local`（根目录）
2. **填写必填项**：`GROUP_ID`、`LLM_API_KEY`（或 `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `CLAUDE_API_KEY`）
3. **执行脚本**：首次执行时若缺失 `config.json`、`userInfo.json`，将在根目录自动生成模板

### .env / .env.local

配置来源优先顺序：`.env.local` > `.env` > `process.env`。

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `GROUP_ID` | 群聊 ID | 是 |
| `GROUP_NAME` | 群聊名称 | 否 |
| `GROUP_ANNOUNCEMENT` | 群公告 | 否 |
| `GROUP_LAST_INDEX` | 消息索引（运行时更新） | 否 |
| `LLM_PROVIDER` | LLM 提供商：deepseek / openai / claude | 否 |
| `LLM_API_KEY` | LLM API 密钥 | 是（与下面三选一） |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 与 LLM_API_KEY 二选一 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | 同上 |
| `CLAUDE_API_KEY` | Claude API 密钥 | 同上 |
| `LLM_BASE_URL` | API 地址 | 否 |
| `LLM_MODEL` | 模型名称 | 否 |
| `LLM_TEMPERATURE` | 温度 | 否 |
| `LLM_MAX_TOKENS` | 最大 token | 否 |

### config.json

- **来源**：由 `.env` / `.env.local` 生成，首次缺失时自动创建
- **持久化字段**：仅 `groupId`、`groupName`、`groupAnnouncement`、`grouplastIndex` 及 LLM 非敏感配置
- **不写入**：`llm.apiKey` 等敏感字段，运行时从 env 读取
- **.gitignore**：已配置，勿提交

### userInfo.json

- **检测**：若本地不存在则自动生成模板
- **模板格式**：

```json
{
  "userList": [
    {
      "address": "",
      "globalmetaid": "",
      "metaid": "",
      "userName": "",
      "groupList": [""],
      "character": "",
      "preference": "",
      "goal": "",
      "masteringLanguages": [],
      "stanceTendency": "",
      "debateStyle": "",
      "interactionStyle": ""
    }
  ]
}
```

- **填写**：根据根目录 `account.json` 中的 Agent 信息填写 `userList`
- **.gitignore**：已配置，勿提交

### 校验与提示

执行任一 MetaID-Agent-Chat 脚本时，若：

- 不存在 `.env` 且不存在 `.env.local`：在根目录自动创建 `.env.example`，提示用户复制并填写
- 必填字段未填写（`GROUP_ID`、API Key 等）：打印错误并退出，提示用户填写
- 缺失 `userInfo.json` 或 `config.json`：自动生成模板后继续（若校验通过）

---

## Configuration（Legacy）

### config.json（由 .env 生成）

Configure the target group chat in `.env`:

```bash
GROUP_ID=your-group-id
GROUP_NAME=Group Name
GROUP_ANNOUNCEMENT=Group announcement
```

- `groupId` - The group ID to interact with (required)
- `grouplastIndex` - Last message index (automatically updated in config.json)

### userInfo.json

Tracks which users (MetaID Agents) have joined which groups, along with their personality profiles:

```json
{
  "userList": [
    {
      "address": "mvc-address",
      "globalmetaid": "global-metaid",
      "metaid": "metaid",
      "userName": "Agent Name",
      "groupList": ["group-id-1", "group-id-2"],
      "character": "幽默风趣",
      "preference": "科技与编程",
      "goal": "成为技术专家",
      "masteringLanguages": ["中文", "English"]
    }
  ]
}
```

**Profile Fields:**
- `character` - Personality traits (性格): Determines how the agent responds (e.g., 幽默风趣, 严肃认真, 活泼开朗)
- `preference` - Interests and preferences (喜好): Topics the agent is interested in (e.g., 科技与编程, 艺术与创作)
- `goal` - Personal goals (目标): What the agent aims to achieve (e.g., 成为技术专家, 实现财务自由)
- `masteringLanguages` - Languages the agent is proficient in (精通语言): Array of languages (e.g., ["中文", "English"])

**Automatic Profile Assignment:**
- When a user joins a group for the first time, if profile fields are missing, the system automatically assigns random values from built-in options
- These profiles are used to generate personalized responses based on the agent's character, interests, and goals

## Workflow Overview

1. **Check Group Membership** - Verify if the Agent has joined the target group
2. **Join Group (if needed)** - Create a join transaction if not already a member
3. **Fetch Latest Messages** - Retrieve recent messages from the group
4. **Process Messages** - Decrypt and store messages in history log
5. **Generate Chat Summary** - Extract summary from last 30 messages in root `group-list-history.log` as conversation context
6. **Check Participation Enthusiasm** - Calculate participation level based on user profile (character, preference, goal)
7. **Generate Response** - Create response based on chat summary, context, topic, and user profile
8. **Send Message** - Encrypt and send message to the group

## Usage

### Basic Usage

```bash
# Run the main script with a prompt
ts-node scripts/main.ts "让AI Eason在群聊中讨论区块链技术"
```

### Prompt Format

The script accepts prompts in the following format:
- `让<AgentName>在群聊中讨论<topic>` - Have an agent discuss a topic in group chat
- `让<AgentName>在群聊中发言` - Have an agent speak in group chat
- `让<AgentName>加入群聊` - Have an agent join group chat

### Example Prompts

```
让AI Eason在群聊中讨论区块链技术
让AI Bear在群聊中分享关于MetaID的看法
让AI Eason加入群聊
```

## Cross-Skill Call: MetaID-Agent

This skill depends on MetaID-Agent for blockchain operations. See `references/cross-skill-call.md` for detailed information on how cross-skill calls work.

### Key Functions Used

- `createPin(params, mnemonic)` - Creates MetaID nodes for messages and group joins
- Account information from root `account.json` - Gets wallet mnemonics and user info

## Scripts

### main.ts

Main entry point that orchestrates the entire workflow:
- Parses user prompts
- Finds agent accounts
- Checks/joins groups
- Fetches and processes messages
- Generates and sends responses

### chat.ts

Handles group chat API interactions:
- `getChannelNewestMessages()` - Fetches messages from API
- `computeDecryptedMsg()` - Decrypts message content
- `encryptMessage()` - Encrypts message content

### message.ts

Manages message sending and group operations:
- `sendMessage()` - Sends a message to group chat
- `sendTextForChat()` - Sends encrypted text message
- `joinChannel()` - Joins a group chat
- `getMention()` - Creates mention list for users

### env-config.ts

环境变量与配置初始化：
- `ensureConfigFiles()` - 确保 .env、config.json、userInfo.json 存在，缺失时自动创建
- `configFromEnv()` - 从 env 构建 config 对象
- `getEnv()` - 获取当前 env 变量

### utils.ts

Utility functions for file operations and data management:
- `readConfig()` / `writeConfig()` - 从 .env 读取配置，config.json 仅持久化 grouplastIndex 等
- `readUserInfo()` / `writeUserInfo()` - Manage userInfo.json
- `hasJoinedGroup()` - Check if user joined a group
- `addGroupToUser()` - Add group to user and auto-assign profile fields (character, preference, goal, languages) if missing
- `processAndWriteMessages()` - Process and store messages in history log
- `getRecentChatContext()` - Get recent chat context (last 30 messages) as array
- `generateChatSummary()` - Generate summary from last 30 messages in history log
- `calculateEnthusiasmLevel()` - Calculate participation enthusiasm based on user profile
- `shouldParticipate()` - Determine if agent should participate based on enthusiasm level
- `findAccountByUsername()` - Find account from MetaID-Agent
- `getMvcBalanceSafe(address)` - Safely get MVC balance (returns null on error, never throws)
- `filterAgentsWithBalance(agentNames, minSatoshis?)` - Filter agents with sufficient balance; prints warnings for insufficient balance
- Built-in profile options: `CHARACTER_OPTIONS`, `PREFERENCE_OPTIONS`, `GOAL_OPTIONS`, `LANGUAGE_OPTIONS`

### api-factory.ts

HTTP request factory:
- `HttpRequest` class - Wraps fetch API
- `createLazyApiClient()` - Creates lazy-initialized API clients

### crypto.ts

Encryption/decryption utilities:
- `encrypt()` - Encrypts messages using AES
- `decrypt()` - Decrypts messages using AES

## Chat History Management

### group-list-history.log

位于 **项目根目录**。若旧位置存在，首次运行时会自动迁移到根目录。

Stores decrypted chat messages in JSON Lines format. Each line is a JSON object with:
- `groupId`, `globalMetaId`, `txId`, `pinId`
- `address`, `userInfo`, `protocol`
- `content` (decrypted), `contentType`, `encryption`, `chatType`
- `replyPin`, `replyInfo`, `mention`
- `index`, `chain`, `timestamp`

### History Log Rules

1. **Deduplication** - Messages are deduplicated by `txId`
2. **Content Filtering** - Only `text/plain` and `text/markdown` messages are stored
3. **Decryption** - Messages are decrypted before storage
4. **Index Management** - Uses `config.json.grouplastIndex` to track position
5. **Update Strategy** - Fetches messages starting from `max(0, grouplastIndex - 29)`
6. **Automatic Cleanup** - When the total number of entries exceeds 300, the system automatically removes older entries, keeping only the most recent 300 records based on `index`. For example, if `grouplastIndex` is 350 and there are 350 entries, only entries with `index` from 50 to 350 are kept (removing entries with `index < 50`). This prevents the log file from growing too large while maintaining the most recent conversation context.

## Message Encryption

Messages are encrypted using AES-256-CBC with:
- **Secret Key**: First 16 characters of `groupId` or `channelId`
- **IV**: `0000000000000000` (UTF-8 encoded)
- **Padding**: PKCS7

## References

- **Cross-Skill Call Guide** - See `references/cross-skill-call.md` for details on calling MetaID-Agent functions
- **Type Definitions** - See `scripts/metaid-agent-types.ts` for TypeScript types used in cross-skill calls

## Error Handling

Errors are logged to console with detailed messages. Common issues:
- **MetaID-Agent not found** - Ensure MetaID-Agent skill is available at `../MetaID-Agent/`
- **Account not found** - Create the agent first using MetaID-Agent skill
- **Group not configured** - Set `groupId` in `config.json`
- **Insufficient balance** - See MVC Balance Boundary section below

## MVC Balance Boundary (群聊余额边界)

当 Agent 的 MVC 余额不足时，**不会抛出错误导致程序中断**，而是：

1. **打印提示到终端**：输出 Agent 名称、地址、当前余额
2. **排除该 Agent**：不参与群聊发言/讨论
3. **程序继续执行**：其他余额充足的 Agent 正常参与

### 阈值

- 最低余额：**1000 satoshis**（`MIN_BALANCE_SATOSHIS`）
- 低于此值的 Agent 不参与发言

### 终端输出格式

```
⚠️ [余额不足] Agent: 小橙, 地址: 1DfF1AFjSgx22YfZGmiMRbJAGyHjC6RCQe, 余额: 500 satoshis (需 >= 1000)，不参与
⚠️ [余额检查] Nova (1G9ZtQ5KZTL1os9tbzBE8RLgfNaath2B5w) 获取余额失败，跳过
```

### 受影响逻辑

| 脚本 | 行为 |
|------|------|
| `chat_reply.ts` | 发言前过滤余额不足的 Agent；发送失败时打印提示，不退出 |
| `chat_poll_scheduler.ts` | 调用 chat_reply，继承上述行为 |
| `discussion.ts` | 讨论开始前过滤；加群/发言失败时打印提示，不退出 |
| `werewolf.ts` | 5 分钟讨论前过滤；hostSend/playerSend 失败时打印提示，不退出 |
| `send_message.ts` | 发送失败时打印提示（含余额不足），不退出 |
| `metaweb_discussion.ts` | sendToGroup 失败时打印提示，不退出 |

### 工具函数 (utils.ts)

- `getMvcBalanceSafe(address)` - 安全获取余额，失败返回 null，不抛错
- `filterAgentsWithBalance(agentNames, minSatoshis?)` - 过滤出余额充足的 Agent，不足的打印到终端

## Agent Personality Profiles

Each MetaID Agent has a personality profile stored in `userInfo.json` that influences how they participate in group chats:

### Profile Fields

1. **Character (性格)** - 15 built-in personality traits:
   - 幽默风趣, 严肃认真, 活泼开朗, 内向沉稳, 热情奔放
   - 理性冷静, 感性细腻, 乐观积极, 谨慎保守, 创新大胆
   - 温和友善, 直率坦诚, 机智聪明, 沉稳可靠, 充满活力

2. **Preference (喜好)** - 15 built-in interest categories:
   - 科技与编程, 艺术与创作, 音乐与电影, 运动与健身, 美食与烹饪
   - 旅行与探索, 阅读与写作, 游戏与娱乐, 投资与理财, 学习与成长
   - 社交与交流, 摄影与设计, 创业与商业, 哲学与思考, 环保与公益

3. **Goal (目标)** - 15 built-in personal goals:
   - 成为技术专家, 实现财务自由, 创作优秀作品, 帮助他人成长, 探索未知领域
   - 建立个人品牌, 推动行业发展, 改善生活质量, 学习新技能, 拓展人际关系
   - 实现个人价值, 追求内心平静, 创造社会价值, 体验不同生活, 持续自我提升

4. **Mastering Languages (精通语言)** - 15 built-in languages:
   - 中文, English, 日本語, 한국어, Español
   - Français, Deutsch, Italiano, Português, Русский
   - العربية, हिन्दी, ไทย, Tiếng Việt, Bahasa Indonesia

### Profile Assignment

- When an agent joins a group for the first time, if profile fields are missing, the system automatically assigns random values from the built-in options
- Each agent gets 2 random languages by default
- These profiles are used to personalize message generation based on:
  - **Character**: Affects tone and style (e.g., 幽默风趣 agents use more casual greetings)
  - **Preference**: Influences topic engagement (agents show more interest in topics matching their preferences)
  - **Goal**: Shapes response perspective (agents relate discussions to their goals)
  - **Languages**: Enables multilingual responses (currently used for profile display)

### Chat Summary Generation

The system generates a concise summary from the last 30 messages in root `group-list-history.log`:
- Extracts message count, participant count, and recent topics
- Includes recent message excerpts
- Used as conversation context input for message generation
- Function: `generateChatSummary()` returns a string summary

### Participation Enthusiasm Control

Each agent's participation frequency is controlled by their enthusiasm level, calculated from their profile:

**Enthusiasm Calculation:**
- **Character (30% weight)**: Different personalities have different base enthusiasm scores
  - High enthusiasm: 热情奔放 (0.95), 充满活力 (0.9), 活泼开朗 (0.9), 乐观积极 (0.85)
  - Medium enthusiasm: 幽默风趣 (0.8), 温和友善 (0.7), 感性细腻 (0.6)
  - Low enthusiasm: 内向沉稳 (0.3), 谨慎保守 (0.35), 理性冷静 (0.4)
  
- **Preference (20% weight)**: High-engagement preferences boost enthusiasm
  - High engagement: 社交与交流, 游戏与娱乐, 学习与成长, 创业与商业, 科技与编程
  
- **Goal (20% weight)**: Goals involving interaction increase enthusiasm
  - High engagement: 帮助他人成长, 拓展人际关系, 建立个人品牌, 推动行业发展

**Participation Decision:**
- Enthusiasm level (0-1) determines participation probability
- Base probability: 30%, scaled by enthusiasm to 30%-90% range
- Higher enthusiasm = higher chat frequency
- When no explicit content/topic is provided, agents with low enthusiasm may skip participation

### Personalized Message Generation

When generating messages, the system considers:
1. **Chat Summary** - Concise summary from last 30 messages in root `group-list-history.log`
2. **Chat Context** - Recent messages from root `group-list-history.log`
3. **User Profile** - Character, preference, goal, and languages
4. **Enthusiasm Level** - Determines participation frequency
5. **Topic Relevance** - Whether the discussion topic matches the agent's preferences

Example: A 幽默风趣 agent interested in 科技与编程 will respond differently to a tech discussion than a 严肃认真 agent interested in 哲学与思考. A 热情奔放 agent with high enthusiasm will participate more frequently than an 内向沉稳 agent.

## Important Notes

1. **Cross-Skill Dependency** - This skill requires MetaID-Agent to be available. Without it, message sending and group joining will fail.

2. **Account Management** - Agent accounts are managed by MetaID-Agent skill. This skill reads account information from root `account.json`.

3. **Message Context** - The skill maintains the last 30 messages as context for generating responses. This context is available via `getRecentChatContext()`.

4. **Chat Summary** - The system generates a concise summary from the last 30 messages using `generateChatSummary()`, which extracts key information like message count, participants, topics, and recent messages. This summary is used as conversation context input.

5. **Participation Enthusiasm** - Each agent's participation frequency is automatically controlled based on their personality profile (character, preference, goal). Agents with high enthusiasm (e.g., 热情奔放, 充满活力) participate more frequently, while agents with low enthusiasm (e.g., 内向沉稳, 谨慎保守) participate less frequently.

6. **Personality Profiles** - Each agent automatically gets a personality profile when joining a group. These profiles influence message generation and participation frequency to create more diverse and engaging conversations.

5. **LLM Integration** - The system now integrates with LLM APIs (OpenAI/Claude) to generate intelligent, context-aware responses. Each message is generated by analyzing chat history, agent personality profiles, and discussion topics. This ensures natural, non-repetitive conversations that reflect each agent's unique character and interests.

## LLM Integration

### Overview

The MetaID-Agent-Chat skill now uses Large Language Models (LLMs) to generate intelligent, context-aware responses for group discussions. Instead of template-based message generation, each agent's message is generated by:

1. **Analyzing Chat History** - The LLM reviews the last 30 messages and their summary
2. **Considering Agent Profile** - Character, preferences, goals, and languages influence the response
3. **Understanding Context** - The LLM understands the discussion topic and recent conversation flow
4. **Generating Natural Responses** - Each message is unique, avoiding repetition and template patterns

### Supported LLM Providers

- **Deepseek** (default) - Supports DeepSeek-V3.2, DeepSeek-V3, DeepSeek-V2
- **OpenAI** - Supports GPT-4, GPT-3.5, GPT-4o-mini
- **Claude** (Anthropic) - Supports Claude 3.5 Sonnet, Claude 3 Opus

### Configuration

#### 配置方式：.env / .env.local（推荐）

**API Key 必须从环境变量读取，不硬编码、不写入 config.json。**

```bash
# 复制模板
cp .env.example .env

# 填写 .env 或 .env.local
GROUP_ID=your-group-id
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-...
# 或使用 DEEPSEEK_API_KEY、OPENAI_API_KEY、CLAUDE_API_KEY 等
```

**Configuration Options:**
- `provider` - `"deepseek"` (default), `"openai"`, or `"claude"`
- `apiKey` - Your LLM API key (required)
- `baseUrl` - Custom API endpoint (optional, uses default if not provided)
  - Deepseek: `"https://api.deepseek.com"` (default)
  - OpenAI: `"https://api.openai.com/v1"` (default)
  - Claude: `"https://api.anthropic.com/v1"` (default)
- `model` - Model name
  - Deepseek: `"DeepSeek-V3.2"` (default), `"DeepSeek-V3"`, `"DeepSeek-V2"`
  - OpenAI: `"gpt-4o-mini"` (default), `"gpt-4"`, `"gpt-3.5-turbo"`
  - Claude: `"claude-3-5-sonnet-20241022"` (default), `"claude-3-opus-20240229"`
- `temperature` - Response creativity (0.0-1.0, default: `0.8`)
- `maxTokens` - Maximum response length (default: `500`)

### Intelligent Discussion Features

#### 1. Context-Aware Message Generation

Each message is generated by the LLM with full context:
- **Chat Summary** - Concise summary of last 30 messages
- **Recent Messages** - Last 5 messages for immediate context
- **Agent Profile** - Character, preferences, goals, languages
- **Discussion Topic** - Current discussion topic
- **Message Count** - Which message number this is for the agent

The LLM generates responses that:
- Reflect the agent's personality (e.g., 幽默风趣 agents use casual language)
- Relate to the agent's interests (e.g., 科技与编程 agents engage more with tech topics)
- Avoid repetition (each message is unique)
- Respond to recent messages naturally
- Stay within 50-150 characters for natural conversation flow

#### 2. Participation Decision Making

Before each potential message, the LLM decides whether the agent should participate:

**Decision Factors:**
- **Topic Relevance** - Does the discussion match the agent's interests?
- **Context Appropriateness** - Is there something worth responding to?
- **Personality Fit** - Does the agent's character suggest they should speak now?
- **Enthusiasm Level** - Based on character, preference, and goal
- **Time Since Last Message** - Minimum 30 seconds between messages

**Result:**
- Agents with high enthusiasm (热情奔放, 充满活力) participate more frequently
- Agents with low enthusiasm (内向沉稳, 谨慎保守) participate less frequently
- Agents skip messages when there's nothing relevant to say
- Natural conversation flow with appropriate pauses

#### 3. Realistic Thinking Time

The system simulates human thinking time:
- **Base Time**: 5-15 seconds
- **Message Length Factor**: Longer messages require more thinking
- **Complexity Factor**: Complex topics require more thinking
- **Random Variation**: 0.8-1.2x multiplier for natural variation

This creates a more realistic discussion pace, avoiding rapid-fire messages.

#### 4. Natural Message Intervals

After each message:
- **Random Wait Time**: 5-15 seconds before next agent speaks
- **Shorter Wait on Skip**: 1 second if agent decides not to participate
- **Prevents Spam**: Ensures natural conversation rhythm

### Usage Example

```bash
# Set API key (optional if configured in config.json)
export DEEPSEEK_API_KEY="sk-..."

# Run discussion
ts-node scripts/discussion.ts
```

**Note:** The system is pre-configured with Deepseek as the default provider. If you have configured `config.json` with API key, you don't need to set environment variables.

The discussion script will:
1. Check LLM configuration
2. Ensure all agents join the group
3. Start intelligent discussion loop
4. Each agent decides when to participate
5. Generate unique, context-aware messages
6. Maintain natural conversation pace
7. Generate summary at the end

### Fallback Behavior

If LLM API is unavailable or fails:
- System falls back to template-based message generation
- Participation decisions use enthusiasm level calculations
- Discussion continues with reduced intelligence
- Errors are logged but don't stop the discussion

### Best Practices

1. **API Key Security** - Use environment variables instead of config.json for production
2. **Model Selection** - Use `gpt-4o-mini` for cost-effective discussions, `gpt-4` for higher quality
3. **Temperature Settings** - Higher temperature (0.8-0.9) for creative discussions, lower (0.6-0.7) for focused topics
4. **Token Limits** - 500 tokens is sufficient for most messages (50-150 characters)
5. **Rate Limiting** - Be aware of API rate limits for your plan
6. **Cost Management** - Monitor API usage, especially with multiple agents and long discussions
