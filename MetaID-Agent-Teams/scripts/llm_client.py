#!/usr/bin/env python3
"""
LLM 客户端：可配置 API（OpenAI 兼容），未配置时返回占位/规则结果供离线演示。
"""
import json
import os
import sys
from pathlib import Path

# 允许从 MetaID-Agent-Teams 根加载 config
if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
except Exception:
    LLM_API_KEY = os.environ.get("OPENAI_API_KEY")
    LLM_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    LLM_MODEL = os.environ.get("METAID_AGENT_LLM_MODEL", "gpt-4o-mini")


def chat(system: str, user: str, max_tokens: int = 2048) -> str:
    """
    调用 LLM 得到回复文本。未配置 API 时使用本地占位逻辑。
    """
    if not LLM_API_KEY or LLM_API_KEY.strip() == "":
        return _fallback_reply(system, user)
    try:
        return _call_api(system, user, max_tokens)
    except Exception as e:
        return _fallback_reply(system, user, error=str(e))


def _call_api(system: str, user: str, max_tokens: int) -> str:
    try:
        import requests
    except ImportError:
        return _fallback_reply(system, user, error="requests not installed")
    url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    headers = {"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"}
    r = requests.post(url, json=payload, headers=headers, timeout=60)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"].strip()


def _fallback_reply(system: str, user: str, error: str = "") -> str:
    """
    无 API 或调用失败时：根据用户输入关键词生成简单结构化输出，保证流程可跑通。
    """
    u = (user or "").strip().lower()
    s = (system or "").strip().lower()
    if "需求文档" in user or "requirement" in s or "task document" in s:
        # Leader 生成需求文档
        if "菜谱" in user or "recipe" in u:
            return _template_requirement_recipe()
        if "skill" in u or "skills" in u:
            return _template_requirement_generic(user)
        return _template_requirement_generic(user)
    if "skill" in s and "coder" in s:
        # Coder 生成 skill 内容
        return _template_skill_from_requirement(user)
    return f"[占位回复] 已处理。{error and (' 错误: ' + error) or ''}"


def _template_requirement_recipe() -> str:
    return """# 任务需求文档

## 任务概述
编写一个菜谱 Skill，根据用户输入的菜名或食材，告知所需材料和烹饪步骤。

## 技能要求
- 输入：菜名或主要食材
- 输出：材料清单（含用量）、烹饪步骤（分步骤说明）
- 参考 skill-creator 规范，产出 SKILL.md 与可执行脚本

## 角色分工
- **Coder**：负责编写该 Skill（SKILL.md + scripts/ + references/）
- **Tester**：负责验证 Skill 能根据示例输入正确返回材料与步骤
- **Leader**：收到测试通过后公布交付结果

## 验收标准
- Tester 使用至少一个示例输入（如「番茄炒蛋」）调用产出的脚本，能获得包含材料与步骤的合规输出。
"""


def _template_requirement_generic(user_task: str) -> str:
    return f"""# 任务需求文档

## 任务概述
{user_task[:500]}

## 技能要求
- 实现需求描述中约定的功能
- 遵循 skill-creator 规范：SKILL.md（name/description + 使用说明）、scripts/、references/ 按需

## 角色分工
- **Coder**：编写 Skill 并产出到指定目录，完成后通知 Tester
- **Tester**：按需求文档验收（运行脚本或检查输出），通过后汇报 Leader
- **Leader**：收到测试通过后公布交付结果

## 验收标准
- Tester 按需求中的验收条件执行并通过。
"""


def _template_skill_from_requirement(requirement_text: str) -> str:
    """Coder 占位：根据需求生成简单 skill 的 JSON 描述，供 create_skill 使用。"""
    return json.dumps({
        "name": "recipe",
        "description": "根据用户输入的菜名或食材，告知所需材料和烹饪步骤。",
        "skill_md_overview": "菜谱 Skill：输入菜名，输出材料与步骤。",
        "script_name": "get_recipe.py",
        "script_behavior": "接收菜名参数，返回 JSON：ingredients 列表与 steps 列表。",
    }, ensure_ascii=False, indent=2)
