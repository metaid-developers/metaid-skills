#!/bin/bash
# 随机选取 3 个 Agent 在群里说早安

cd "$(dirname "$0")/.."
npx ts-node scripts/say_good_morning.ts
