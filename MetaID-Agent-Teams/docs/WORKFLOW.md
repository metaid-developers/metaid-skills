# MetaID-Agent-Teams 通用协作系统：使用说明与工作流程

本系统按 `agent.md` 设计，实现**通用化**多角色协作：用户只需向 Leader 下达任务（如「需要 Leader 帮我发布一个编写 xxx skills 的任务，由 Coder 编写、Tester 测试、最后 Leader 公布」），系统会**自动**完成需求文档编写、角色派单、Skill 编写与测试、最终公布与交付。

---

## 一、流程概述

1. **用户** 通过 `--task` 或 `--task-file` 把任务描述交给 Orchestrator，Orchestrator 写入协作黑板并派给 **Leader**。
2. **Leader** 根据用户任务，结合 LLM 生成**任务需求文档**（`artifacts/tasks/<task_id>/requirement.md`），内容包括：
   - 任务概述、技能要求（要实现的 Skill 做什么）
   - 角色分工：谁负责编写 Skill、谁负责测试、最后由谁交付并公布
   - 验收标准
   然后向 **Coder** 派单。
3. **Coder** 读取需求文档，结合自身「创建 Skill」能力（参考 skill-creator 规范），在 `artifacts/skills/` 下编写 Skill（SKILL.md + scripts/ + references/），完成后向 **Tester** 派单。
4. **Tester** 根据需求文档与 Coder 交付的路径进行验收测试（如运行脚本、检查输出），测试通过后向 **Leader** 汇报（写 DONE 到日志）。
5. **Leader** 发现 Tester 已汇报测试通过，生成**交付摘要**（`artifacts/tasks/<task_id>/delivery.md`），向所有人公布，流程结束；Orchestrator 输出最终结果。

整体上：**Agent 自行安排工作、自行执行交付**，用户端只需定义「本次任务用了什么角色」和任务内容。

---

## 二、如何使用

### 2.1 环境

- Python 3.9+
- 可选：设置 `OPENAI_API_KEY`（或 `METAID_AGENT_LLM_API_KEY`）以使用 LLM 生成需求文档与 Coder 的 JSON；未设置时使用内置占位逻辑，流程仍可跑通。

### 2.2 下达任务并跑通流程

```bash
cd MetaID-Agent-Teams

# 方式一：命令行直接传任务
python3 scripts/run_team.py --task "需要 Leader 帮我发布一个编写菜谱 skills 的任务，根据用户输入告知材料和烹饪过程，由 Coder 编写、Tester 测试、最后 Leader 公布。"

# 方式二：从文件读取任务
echo "需要 Leader 发布一个编写「天气查询」skills 的任务..." > my_task.txt
python3 scripts/run_team.py --task-file my_task.txt

# 清空旧日志后执行（建议新任务时使用）
python3 scripts/run_team.py --fresh --task "需要 Leader 帮我发布一个编写 xxx skills 的任务，..."
```

### 2.3 预期输出

- 终端依次打印：`[Leader] task_assigned` → `[Coder] handed_to_tester` → `[Tester] reported_success` → `[Leader] announced`，最后 `[Orchestrator] 流程结束：Leader 已公布交付结果。`
- 协作记录在 `task_log.txt`；需求文档在 `artifacts/tasks/<task_id>/requirement.md`；交付摘要在 `artifacts/tasks/<task_id>/delivery.md`；产出的 Skill 在 `artifacts/skills/<task_id>_<skill_name>/`。

### 2.4 查看交付物

- **需求文档**：`artifacts/tasks/<task_id>/requirement.md`
- **交付摘要**：`artifacts/tasks/<task_id>/delivery.md`
- **产出的 Skill**：`artifacts/skills/<task_id>_<skill_name>/`（内含 SKILL.md、scripts/、references/）

---

## 三、核心技术（对应 agent.md）

| 需求点 | 实现方式 |
|--------|----------|
| 协作黑板 | 单一日志文件 `task_log.txt`，结构化格式 `[To: 角色] [From: 角色] [TaskID] [Status: TODO/DONE] Message`，写入时 fcntl 文件锁 |
| 角色只处理自己的 TODO | `log_bus.read_todo_for(agent_name)` 只返回 To=自己且 Status=TODO 的条目；Leader 额外扫描日志中的 Tester DONE 以决定公布 |
| 任务文档驱动 | Leader 用 LLM 生成 requirement.md（任务概述、技能要求、角色分工、验收标准），Coder/Tester 按该文档执行与验收 |
| Coder 的 create_skill 能力 | `skill_factory.create_skill_from_requirement()` 按需求 + LLM 生成的 JSON 在 artifacts/skills 下生成符合 skill-creator 规范的目录 |
| ReAct / LLM | 各 Agent 可接入 LLM（Leader 生成需求、Coder 生成 skill 规格）；未配置 API 时使用占位逻辑保证流程可跑通 |
| 通用化 | 用户任务任意描述；需求文档与产出目录均按 task_id 组织，不写死某一类 Skill |

---

## 四、目录结构

```
MetaID-Agent-Teams/
├── agent.md              # 设计需求
├── config.py              # 路径、LLM 配置
├── task_log.txt           # 协作黑板（运行后生成）
├── requirements.txt       # 可选依赖（如 requests）
├── scripts/
│   ├── log_bus.py         # 日志总线
│   ├── llm_client.py      # LLM 调用 / 占位
│   ├── task_doc.py        # 需求文档与交付摘要读写
│   ├── skill_factory.py   # 根据需求生成 Skill 目录
│   ├── agent_leader.py    # Leader
│   ├── agent_coder.py     # Coder
│   ├── agent_tester.py    # Tester
│   └── run_team.py        # Orchestrator 入口
├── artifacts/
│   ├── tasks/             # <task_id>/requirement.md, delivery.md, user_task.txt
│   └── skills/            # <task_id>_<name>/ SKILL.md, scripts/, references/
└── docs/
    ├── WORKFLOW.md        # 本文档
    └── protocol.md        # 协作协议
```

---

## 五、总结

- **使用方式**：用 `--task` 或 `--task-file` 把任务交给 Leader，运行 `python3 scripts/run_team.py`，系统自动完成需求文档 → Coder 编写 Skill → Tester 测试 → Leader 公布并写入 delivery.md。
- **通用性**：任务内容与角色分工由用户描述、Leader 需求文档约定，Agent 按文档自行安排与执行，产出按 task_id 归档，可复用于任意「编写 xxx skills」类任务。
