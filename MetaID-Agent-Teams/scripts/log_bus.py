#!/usr/bin/env python3
"""
协作黑板（日志总线）：结构化任务分发与状态读写。
格式: [To: AgentName] [From: Sender] [TaskID: ID] [Status: TODO|DONE] Message
"""
import fcntl
import re
from pathlib import Path
from datetime import datetime

# 使用仓库 config 中的路径
try:
    from config import TASK_LOG_PATH as DEFAULT_LOG_PATH
except Exception:
    DEFAULT_LOG_PATH = Path(__file__).resolve().parent.parent / "task_log.txt"


def _ensure_log(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.touch()


def append(message: str, log_path: Path = DEFAULT_LOG_PATH) -> None:
    """线程/进程安全的追加写入。"""
    _ensure_log(log_path)
    with open(log_path, "a", encoding="utf-8") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            ts = datetime.now().isoformat(timespec="seconds")
            f.write(f"{ts} | {message}\n")
            f.flush()
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def read_todo_for(agent_name: str, log_path: Path = DEFAULT_LOG_PATH) -> list[dict]:
    """读取发给指定 Agent 且 Status 为 TODO 的条目。"""
    if not log_path.exists():
        return []
    with open(log_path, "r", encoding="utf-8") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        try:
            raw = f.read()
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    return parse_todo_entries(raw, agent_name)


def parse_todo_entries(raw: str, to_agent: str) -> list[dict]:
    """从日志文本解析 [To: to_agent] 且 Status: TODO 的条目。"""
    pattern = re.compile(
        r"^\d{4}-\d{2}-\d{2}T[\d:]+\s+\|\s+"
        r"\[To:\s*(\w+)\]\s+\[From:\s*(\w+)\]\s+\[TaskID:\s*(\S+)\]\s+\[Status:\s*(TODO|DONE)\]\s+(.*)$",
        re.MULTILINE,
    )
    entries = []
    for m in pattern.finditer(raw):
        to_name, from_name, task_id, status, msg = m.groups()
        if to_name == to_agent and status == "TODO":
            entries.append({
                "to": to_name,
                "from": from_name,
                "task_id": task_id,
                "status": status,
                "message": msg.strip(),
            })
    return entries


def read_all(log_path: Path = DEFAULT_LOG_PATH) -> str:
    """读取完整日志内容。"""
    if not log_path.exists():
        return ""
    with open(log_path, "r", encoding="utf-8") as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        try:
            return f.read()
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def write_task(to_agent: str, from_agent: str, task_id: str, status: str, message: str, log_path: Path = DEFAULT_LOG_PATH) -> None:
    """写入一条结构化任务。"""
    line = f"[To: {to_agent}] [From: {from_agent}] [TaskID: {task_id}] [Status: {status}] {message}"
    append(line, log_path)
