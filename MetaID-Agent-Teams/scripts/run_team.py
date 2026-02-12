#!/usr/bin/env python3
"""
Orchestrator：根据用户下达的任务驱动 Agent 协作，直至 Leader 公布交付结果。
用法：
  python scripts/run_team.py --task "需要 Leader 帮我发布一个编写 xxx skills 的任务..."
  python scripts/run_team.py --task-file path/to/task.txt
  python scripts/run_team.py --fresh --task "..."   # 清空旧日志后执行
"""
import argparse
import sys
from pathlib import Path
from datetime import datetime

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import TEAMS_ROOT, TASK_LOG_PATH, ARTIFACTS_ROOT
from scripts.log_bus import read_all, write_task
from scripts.task_doc import save_user_task


def _task_id() -> str:
    return "task_" + datetime.now().strftime("%Y%m%d%H%M%S")


def main():
    ap = argparse.ArgumentParser(description="MetaID-Agent-Teams Orchestrator")
    ap.add_argument("--task", type=str, help="用户下达给 Leader 的任务描述")
    ap.add_argument("--task-file", type=str, help="从文件读取任务描述（与 --task 二选一）")
    ap.add_argument("--fresh", action="store_true", help="清空 task_log 后再运行")
    ap.add_argument("--max-cycles", type=int, default=5, help="最多执行几轮 Leader/Coder/Tester/Leader")
    args = ap.parse_args()

    user_task = ""
    if args.task:
        user_task = args.task.strip()
    elif args.task_file:
        p = Path(args.task_file)
        if p.exists():
            user_task = p.read_text(encoding="utf-8").strip()
        else:
            print(f"错误：任务文件不存在 {p}")
            sys.exit(1)
    else:
        # 无任务时仅跑一轮已有日志（用于续跑或演示）
        user_task = ""

    if args.fresh and TASK_LOG_PATH.exists():
        TASK_LOG_PATH.write_text("", encoding="utf-8")

    ARTIFACTS_ROOT.mkdir(parents=True, exist_ok=True)

    # 若有用户任务，写入并派给 Leader
    task_id = _task_id() if user_task else None
    if user_task:
        save_user_task(task_id, user_task)
        write_task("Leader", "User", task_id, "TODO", user_task)
        print(f"[Orchestrator] 已接收任务 (TaskID: {task_id})，交由 Leader 编写需求文档并派单。\n")

    # 导入各 Agent（需 TEAMS_ROOT 在 path 内）
    import scripts.agent_leader as agent_leader
    import scripts.agent_coder as agent_coder
    import scripts.agent_tester as agent_tester

    for cycle in range(args.max_cycles):
        steps = [
            ("Leader", agent_leader.run_leader),
            ("Coder", agent_coder.run_coder),
            ("Tester", agent_tester.run_tester),
            ("Leader", agent_leader.run_leader),
        ]
        for name, fn in steps:
            out = fn()
            print(f"[{name}] {out}")
        log = read_all(TASK_LOG_PATH)
        if "[To: All]" in log:
            print("\n[Orchestrator] 流程结束：Leader 已公布交付结果。")
            break
    else:
        print("\n[Orchestrator] 已达最大轮数，未收到公布。")

    print("\n--- task_log 末尾 ---")
    lines = read_all(TASK_LOG_PATH).strip().split("\n")
    for line in lines[-8:]:
        print(line)


if __name__ == "__main__":
    main()
