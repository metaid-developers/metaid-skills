#!/usr/bin/env python3
"""
Skill 工厂：根据需求文档或 LLM 生成的规格，在 artifacts/skills 下创建符合 skill-creator 规范的 Skill 目录。
Coder 调用此模块完成「编写 Skill」的交付物。
"""
import json
import re
import sys
from pathlib import Path
from typing import Optional

if str(Path(__file__).resolve().parent.parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import SKILLS_OUTPUT_DIR


def _slug(s: str) -> str:
    return re.sub(r"[^\w\-]", "", s.replace(" ", "-").lower())[:40]


def create_skill_from_requirement(task_id: str, requirement_md: str, llm_hint: str = "") -> Path:
    """
    根据需求文档（及可选的 LLM 生成的 JSON 描述）创建 Skill 目录。
    若 llm_hint 为空则从 requirement_md 中提取目标功能并生成默认菜谱类 Skill。
    返回产出目录路径。
    """
    # 从需求中推断 name/description
    name = "custom-skill"
    description = "根据需求文档实现的 Skill。"
    if "菜谱" in requirement_md or "recipe" in requirement_md.lower():
        name = "recipe"
        description = "根据用户输入的菜名或食材，告知所需材料和烹饪步骤。"
    if llm_hint.strip():
        try:
            obj = json.loads(llm_hint)
            name = obj.get("name", name)
            description = obj.get("description", description)
        except Exception:
            pass

    skill_name = _slug(name)
    out_dir = SKILLS_OUTPUT_DIR / f"{task_id}_{skill_name}"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "scripts").mkdir(exist_ok=True)
    (out_dir / "references").mkdir(exist_ok=True)

    skill_md = f"""---
name: {skill_name}
description: {description}
---

# {name} Skill

## 概述

{description}

## 使用方式

根据需求文档与 scripts 下的可执行脚本使用本 Skill。

## 资源

### scripts/

见具体脚本说明。
"""
    (out_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")

    # 默认提供一个可运行的脚本（菜谱或通用占位）
    if name == "recipe" or "菜谱" in description:
        script_content = _recipe_script()
    else:
        script_content = _generic_script(skill_name)
    (out_dir / "scripts" / "main.py").write_text(script_content, encoding="utf-8")

    ref = "# 参考\n\n本 Skill 由 MetaID-Agent-Teams Coder 根据需求文档生成。"
    (out_dir / "references" / "README.md").write_text(ref, encoding="utf-8")
    return out_dir


def _recipe_script() -> str:
    return '''#!/usr/bin/env python3
"""根据菜名返回材料和烹饪步骤。"""
import sys
import json
RECIPES = {
    "番茄炒蛋": {
        "ingredients": ["番茄 2 个", "鸡蛋 3 个", "盐、糖、葱花适量", "食用油"],
        "steps": ["番茄洗净切块，鸡蛋打散加少许盐。", "锅热油，先炒蛋至凝固盛出。", "再下番茄炒出汁，加盐、糖调味。", "倒入鸡蛋翻炒，撒葱花即可。"],
    },
    "红烧肉": {
        "ingredients": ["五花肉 500g", "冰糖、生抽、老抽、料酒", "葱姜、八角"],
        "steps": ["五花肉切块焯水去血沫。", "锅少油炒糖色，下肉块翻炒上色。", "加生抽、老抽、料酒、葱姜八角，加水没过肉。", "大火烧开转小火炖约 1 小时，收汁即可。"],
    },
}
def get_recipe(dish):
    dish = dish.strip()
    if dish in RECIPES:
        return {"dish": dish, **RECIPES[dish]}
    return {"dish": dish, "ingredients": [f"根据「{dish}」准备主料、辅料、调味料"], "steps": ["1. 准备食材 2. 预处理 3. 烹饪 4. 装盘"]}
if __name__ == "__main__":
    dish = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("菜名: ").strip() or "番茄炒蛋"
    print(json.dumps(get_recipe(dish), ensure_ascii=False, indent=2))
'''

def _generic_script(skill_name: str) -> str:
    return f'''#!/usr/bin/env python3
"""{skill_name} skill 主脚本。"""
import sys
def main():
    print("OK")
if __name__ == "__main__":
    main()
'''


def get_skill_output_dir(task_id: str) -> Optional[Path]:
    """根据 task_id 查找已产出的 skill 目录（第一个匹配的）。"""
    if not SKILLS_OUTPUT_DIR.exists():
        return None
    for d in SKILLS_OUTPUT_DIR.iterdir():
        if d.is_dir() and d.name.startswith(task_id + "_"):
            return d
    return None
