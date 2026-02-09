#!/bin/bash
# Agent 任务委托场景 - 深夜群聊模式
# 整合 agent.md 上下文为群聊话题，2 反驳型 + 3 非反驳型 Agent 围绕「自然语言任务→MCP 匹配→私聊→SPACE 支付→任务执行」全流程讨论

cd "$(dirname "$0")/.."

if [ "$1" = "-b" ] || [ "$1" = "--background" ]; then
  LOG_FILE="${2:-agent_task_delegation_night_chat.log}"
  echo "🌙 后台启动 Agent 任务委托场景深夜群聊"
  echo "   议题: 自然语言任务 → MCP 匹配 Agent → 私聊沟通 → SPACE 支付 → 任务执行"
  echo "   日志: $LOG_FILE"
  nohup npx ts-node scripts/agent_task_delegation_night_chat.ts >> "$LOG_FILE" 2>&1 &
  echo "✅ 已启动，PID: $!"
  echo "   查看日志: tail -f $LOG_FILE"
else
  LOG_FILE="${1:-agent_task_delegation_night_chat.log}"
  echo "🌙 Agent 任务委托场景 - 深夜群聊模式"
  echo "   议题: 自然语言任务 → MCP 匹配 Agent → 私聊沟通 → SPACE 支付 → 任务执行"
  echo "   参与者: 2 反驳型 + 3 非反驳型 Agent"
  echo "   日志: $LOG_FILE"
  echo ""
  npx ts-node scripts/agent_task_delegation_night_chat.ts 2>&1 | tee "$LOG_FILE"
fi
