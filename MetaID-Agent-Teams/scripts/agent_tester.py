#!/usr/bin/env python3
"""
Tester Agent（通用）：根据 Coder 交付的 Skill 路径与需求文档进行验收测试，通过后汇报 Leader。
"""
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import TASK_LOG_PATH, SKILLS_OUTPUT_DIR
from scripts.log_bus import read_todo_for, write_task
from scripts.task_doc import load_requirement
from scripts.log_bus import read_all
from scripts.skill_factory import get_skill_output_dir


def _find_skill_path(task_id: str, message: str) -> Optional[Path]:
    """从 TODO 消息或已产出目录解析 Skill 路径。"""
    # 消息中可能包含 "路径: /path/to/skill"
    m = re.search(r"路径:\s*([^\s，,]+)", message)
    if m:
        p = Path(m.group(1).strip())
        if p.exists():
            return p
    return get_skill_output_dir(task_id)


def _run_skill_test(skill_dir: Path, requirement_md: str) -> tuple[bool, str]:
    """
    执行验收：若有 main.py 则运行并检查输出；否则只检查目录结构。
    返回 (通过, 说明)。
    """
    main_py = skill_dir / "scripts" / "main.py"
    if not main_py.exists():
        if (skill_dir / "SKILL.md").exists():
            return True, "无主脚本，结构合规"
        return False, "缺少 SKILL.md 或 scripts/main.py"
    try:
        r = subprocess.run(
            [sys.executable, str(main_py), "番茄炒蛋"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(main_py.parent),
        )
        out = (r.stdout or "").strip()
        if r.returncode != 0:
            return False, f"脚本退出码 {r.returncode}"
        # 菜谱类：需包含材料/步骤类内容
        if "菜谱" in requirement_md or "材料" in requirement_md or "ingredients" in requirement_md.lower():
            if ("ingredients" in out or "材料" in out) and len(out) > 30:
                return True, "验收通过"
            return False, "输出未包含材料/步骤"
        return True, "验收通过"
    except Exception as e:
        return False, str(e)


def run_tester() -> str:
    todos = read_todo_for("Tester")
    if not todos:
        return "no_task"
    log = read_all(TASK_LOG_PATH)
    for t in todos:
        task_id = t["task_id"]
        # 本 task_id 已汇报过 Leader 则跳过
        if any(task_id in line and "[To: Leader]" in line and "[From: Tester]" in line for line in log.split("\n")):
            continue
        msg = t.get("message", "")
        skill_dir = _find_skill_path(task_id, msg)
        if not skill_dir or not skill_dir.exists():
            write_task("Leader", "Tester", task_id, "DONE", "测试失败：未找到 Skill 产出路径。")
            return "reported_failure"
        requirement = load_requirement(task_id)
        ok, detail = _run_skill_test(skill_dir, requirement)
        if ok:
            write_task("Leader", "Tester", task_id, "DONE", f"Skill 编写完毕并测试成功，可交由 Leader 公布。{detail}")
            return "reported_success"
        write_task("Leader", "Tester", task_id, "DONE", f"测试未通过：{detail}，请 Coder 修复。")
        return "reported_failure"
    return "no_task"


if __name__ == "__main__":
    out = run_tester()
    print(out)
