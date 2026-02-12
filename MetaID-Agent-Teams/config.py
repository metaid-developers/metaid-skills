# MetaID-Agent-Teams 通用配置
from pathlib import Path

# 本仓库根目录
TEAMS_ROOT = Path(__file__).resolve().parent

# 协作黑板
TASK_LOG_PATH = TEAMS_ROOT / "task_log.txt"

# 产出目录
ARTIFACTS_ROOT = TEAMS_ROOT / "artifacts"
TASKS_DIR = ARTIFACTS_ROOT / "tasks"   # 每轮任务的需求文档与交付摘要
SKILLS_OUTPUT_DIR = ARTIFACTS_ROOT / "skills"  # Coder 产出的 skill 目录

# 角色列表（按协作顺序，Leader 出现两次：发布与公布）
ROLES = ["Leader", "Coder", "Tester"]

# LLM：从环境变量读取，未配置时使用本地占位逻辑（不调 API）
import os
LLM_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("METAID_AGENT_LLM_API_KEY")
LLM_BASE_URL = os.environ.get("OPENAI_BASE_URL") or os.environ.get("METAID_AGENT_LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.environ.get("METAID_AGENT_LLM_MODEL", "gpt-4o-mini")

# skill-creator 路径（用于 Coder 调用 init_skill 或参考规范）
REPO_ROOT = TEAMS_ROOT.parent
SKILL_CREATOR_ROOT = REPO_ROOT / "skill-creator"
