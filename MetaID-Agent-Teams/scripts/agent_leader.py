#!/usr/bin/env python3
"""
Leader Agent（通用）：根据用户下达的任务编写需求文档、指派角色、汇总测试结果并公布交付。
- 收到用户任务时：用 LLM 生成需求文档（requirement.md），写明技能要求、谁编写、谁测试、谁交付，然后派单给 Coder。
- 收到 Tester「测试通过」后：生成交付摘要（delivery.md），向所有人公布，并输出最终结果。
"""
import sys
from pathlib import Path

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import TASK_LOG_PATH
from scripts.log_bus import read_all, read_todo_for, write_task
from scripts.task_doc import save_requirement, load_requirement, load_user_task, save_delivery, load_delivery
from scripts.llm_client import chat


SYSTEM_LEADER = """你是团队 Leader。你的职责是：
1. 根据用户下达的任务，编写一份「任务需求文档」；
2. 需求文档必须包含：任务概述、技能要求（要实现的 Skill 做什么）、角色分工（谁负责编写 Skill、谁负责测试、最后由谁交付并公布）、验收标准；
3. 只输出需求文档正文（Markdown），不要输出解释性前缀或后缀。"""


def _generate_requirement(user_task: str) -> str:
    user_content = f"用户下达的任务：\n\n{user_task}\n\n请根据上述任务，编写一份任务需求文档（见 System 说明）。"
    return chat(SYSTEM_LEADER, user_content, max_tokens=2048)


def _task_ids_with_tester_done_but_not_announced(log: str) -> list:
    """从完整日志中找出：有 Tester DONE 且含测试成功、但尚未出现 [To: All] 的 task_id。"""
    import re
    done_ids = set()
    for line in log.split("\n"):
        if "From: Tester" not in line or "Status: DONE" not in line or "测试成功" not in line:
            continue
        m = re.search(r"\[TaskID:\s*(\S+)\]", line)
        if m:
            done_ids.add(m.group(1))
    announced = set()
    for line in log.split("\n"):
        if "To: All" not in line:
            continue
        m = re.search(r"\[TaskID:\s*(\S+)\]", line)
        if m:
            announced.add(m.group(1))
    return [tid for tid in done_ids if tid not in announced]


def run_leader() -> str:
    log = read_all(TASK_LOG_PATH)
    # 优先处理：Tester 已汇报测试成功但尚未公布的 task_id（Tester 写的是 DONE，不会出现在 TODO 里）
    for task_id in _task_ids_with_tester_done_but_not_announced(log):
        req = load_requirement(task_id)
        delivery = f"# 交付摘要\n\n**任务 ID**: {task_id}\n\n**需求摘要**:\n{req[:800]}...\n\n**结论**: 测试已通过，Skill 可对外发布使用。"
        save_delivery(task_id, delivery)
        write_task("All", "Leader", task_id, "DONE", "任务已完成并测试通过，交付结果已写入本任务目录的 delivery.md，可面向大家使用。")
        return "announced"

    todos = read_todo_for("Leader")
    if not todos:
        return "no_task"
    for t in todos:
        task_id = t["task_id"]
        if "[To: All]" in log and task_id in log:
            continue
        msg = t.get("message", "")
        if load_requirement(task_id).strip():
            continue
        user_task = load_user_task(task_id) or msg
        if not user_task.strip():
            continue
        requirement = _generate_requirement(user_task)
        save_requirement(task_id, requirement)
        write_task("Coder", "Leader", task_id, "TODO", f"需求文档已就绪，请根据 artifacts/tasks/{task_id}/requirement.md 编写 Skill，完成后通知 Tester 测试。")
        return "task_assigned"
    return "waiting"


if __name__ == "__main__":
    out = run_leader()
    print(out)
