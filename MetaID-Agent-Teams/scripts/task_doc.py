#!/usr/bin/env python3
"""
任务文档：每轮任务的需求文档（requirement.md）与交付摘要（delivery.md）的读写。
路径约定：artifacts/tasks/<task_id>/requirement.md，artifacts/tasks/<task_id>/delivery.md
"""
import sys
from pathlib import Path

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import TASKS_DIR


def task_dir(task_id: str) -> Path:
    tid = (task_id or "").strip().replace("/", "_").replace(" ", "_")
    d = TASKS_DIR / tid
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_requirement(task_id: str, content: str) -> Path:
    path = task_dir(task_id) / "requirement.md"
    path.write_text(content.strip(), encoding="utf-8")
    return path


def load_requirement(task_id: str) -> str:
    path = task_dir(task_id) / "requirement.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def save_delivery(task_id: str, content: str) -> Path:
    path = task_dir(task_id) / "delivery.md"
    path.write_text(content.strip(), encoding="utf-8")
    return path


def load_delivery(task_id: str) -> str:
    path = task_dir(task_id) / "delivery.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def save_user_task(task_id: str, content: str) -> Path:
    path = task_dir(task_id) / "user_task.txt"
    path.write_text(content.strip(), encoding="utf-8")
    return path


def load_user_task(task_id: str) -> str:
    path = task_dir(task_id) / "user_task.txt"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()
