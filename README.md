# MetaApp Skills（Claude Code 使用说明）

本目录包含可在 **Claude Code**（Cursor / Claude IDE）中使用的 MetaApp 开发与打包 Skills。通过 OpenSkills 安装后，可在对话中使用 `/skills` 查看并启用这些能力。

## 如何引入 MetaApp Skills

1. 在 IDE 终端中执行：
   ```bash
   npx openskills install metaid-developers/metaapp-skills-claude
   ```
2. 启动 Claude，在对话框中输入：
   ```
   /skills
   ```
   即可看到刚拉取的 MetaApp Skills，并可按需启用。

## 如何更新 MetaApp Skills

需要获取最新提交时，在终端执行：

```bash
npx openskills update
```

## 当前可用的 Skills

- **metaapp-develop**：基于 IDFramework 架构开发完整 MetaApp 前端项目（模板、组件、命令、开发指南）。
- **metaapp-builder**：将已完成的 MetaApp 前端项目打包为可发布的 zip 压缩包。

详细说明与触发方式见各 Skill 目录下的 `SKILL.md`。
