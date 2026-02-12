#!/usr/bin/env python3
"""
Coder Agent（通用）：根据 Leader 需求文档编写 Skill，具备 create_skill 能力，完成后交给 Tester。
"""
import sys
from pathlib import Path

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import TASK_LOG_PATH
from scripts.log_bus import read_todo_for, read_all, write_task
from scripts.task_doc import load_requirement
from scripts.llm_client import chat
from scripts.skill_factory import create_skill_from_requirement


SYSTEM_CODER = """你是 Coder，拥有「创建 Skill」的能力。根据需求文档，你需要输出一个 JSON 对象，包含：
- name: skill 名称（英文短横线格式）
- description: 简短描述（何时使用、做什么）
- skill_md_overview: SKILL.md 概述部分一句话
- script_name: 主脚本文件名（如 main.py）
- script_behavior: 脚本行为简述
只输出 JSON，不要其他文字。若需求是菜谱类，name 可为 recipe。"""


def run_coder() -> str:
    todos = read_todo_for("Coder")
    if not todos:
        return "no_task"
    log = read_all(TASK_LOG_PATH)
    for t in todos:
        task_id = t["task_id"]
        # 本 task_id 已向 Tester 派过则跳过
        if any(task_id in line and "[To: Tester]" in line for line in log.split("\n")):
            continue
        requirement = load_requirement(task_id)
        if not requirement.strip():
            continue
        llm_hint = chat(SYSTEM_CODER, f"需求文档：\n\n{requirement[:3000]}\n\n请输出上述 JSON。", max_tokens=1024)
        out_dir = create_skill_from_requirement(task_id, requirement, llm_hint)
        write_task("Tester", "Coder", task_id, "TODO", f"Skill 已编写完成，路径: {out_dir} ，请根据需求文档验收测试。")
        return "handed_to_tester"
    return "no_task"


if __name__ == "__main__":
    out = run_coder()
    print(out)
