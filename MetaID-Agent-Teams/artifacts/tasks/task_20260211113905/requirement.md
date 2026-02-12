# 任务需求文档

## 任务概述
用户下达的任务：

需要 Leader 帮我发布一个编写统计指定metaid每日发送buzz数量skills 的任务，根据用户输入哪个metaid继续skills编写，由 Coder 编写、Tester 测试、最后 Leader 公布。

请根据上述任务，编写一份任务需求文档（见 System 说明）。

## 技能要求
- 实现需求描述中约定的功能
- 遵循 skill-creator 规范：SKILL.md（name/description + 使用说明）、scripts/、references/ 按需

## 角色分工
- **Coder**：编写 Skill 并产出到指定目录，完成后通知 Tester
- **Tester**：按需求文档验收（运行脚本或检查输出），通过后汇报 Leader
- **Leader**：收到测试通过后公布交付结果

## 验收标准
- Tester 按需求中的验收条件执行并通过。