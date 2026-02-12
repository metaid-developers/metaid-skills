# 协作协议（Communication Protocol）

与 `agent.md` 一致：日志采用**结构化指令**，便于 Agent 之间递交任务。

## 格式规范

每条记录一行，格式为：

```text
[To: AgentName] [From: Sender] [TaskID: ID] [Status: TODO|DONE] Message
```

- **To**：目标角色（Leader / Coder / Tester / All）。
- **From**：发送方角色（User 表示用户通过 Orchestrator 下发的任务）。
- **TaskID**：任务唯一标识，同一任务在流转中保持不变。
- **Status**：TODO = 待处理，DONE = 已完成/汇报。
- **Message**：任务描述或汇报内容（自由文本）。

写入时在行首增加时间戳，便于排查顺序：

```text
2025-02-11T12:00:00 | [To: Coder] [From: Leader] [TaskID: recipe-skill-001] [Status: TODO] 参考 creator skills 编写菜谱 skill...
```

## 状态与读取约定

- 各 Agent 通常只处理 **To 为自己** 且 **Status 为 TODO** 的条目；处理完成后追加新记录（Status 可为 DONE）交给下一角色。
- **Leader** 除处理 TODO 外，会扫描整份日志中 **From: Tester** 且 **Status: DONE** 且含「测试成功」的条目，对尚未公布的 task_id 执行公布（写 [To: All]）。
- 不重写或删除历史记录，保证日志可追溯。
