#!/usr/bin/env python3
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
