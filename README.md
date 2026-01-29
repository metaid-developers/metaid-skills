# MetaApp Skills（Claude Code 使用说明）

> **📖 重要提示**：**在使用 MetaApp Skills 前，请先仔细阅读并理解本 README.md 的全部内容**，以确保正确配置和使用。

本目录包含可在 **Claude Code**（Cursor / Claude IDE）中使用的 MetaApp 开发与打包 Skills。通过 OpenSkills 安装后，可在对话中使用 `/skills` 查看并启用这些能力。

## 如何在Claude Code中引入MetaApp Skills

1. 在 IDE 终端中执行：
   ```bash
   npx openskills install metaid-developers/metaapp-skills
   ```
2. 启动 Claude，在对话框中输入：
   ```
   /skills
   ```
   即可看到刚拉取的 MetaApp Skills，并可按需启用。

## 如何在Cursor，Codex等其他Agent平台中引入MetaApp Skills

1. 在 IDE 终端中执行：
   ```bash
   npx openskills install metaid-developers/metaapp-skills
   ```
   
2. **⚠️ 重要提示**：拉取MetaApp Skills仓库成功后会在项目目录中看到 **`.claude/skills`** 这样的文件目录结构。**在非Claude终端（如Cursor、Codex等）中使用MetaApp Skills时，需要修改文件名称**：把 **`.claude/skills`** 改成 **`.codex/skills`** 即可，其他不变。

3. 在 Agent 对话中让助手列举当前可用的 skills，例如：
   - 「列举一下当前可用的 skills」
   - 「当前项目有哪些可用的 skills？」

## 如何更新 MetaApp Skills

需要获取最新提交时，在终端执行：

```bash
npx openskills update
```

## 当前可用的 Skills

- **metaapp-develop**：基于 IDFramework 架构开发完整 MetaApp 前端项目（模板、组件、命令、开发指南）。
- **metaapp-builder**：将已完成的 MetaApp 前端项目打包为可发布的 zip 压缩包。

详细说明与触发方式见各 Skill 目录下的 `SKILL.md`。
