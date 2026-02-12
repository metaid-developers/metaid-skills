---
name: metafs-indexer
description: 基于 Meta 文件索引服务查询用户信息与文件内容。当需要根据 address、metaid 或 globalMetaID 查询用户信息并展示头像，或根据 pinId 查询文件元数据与内容时使用。Base URL 固定为 https://file.metaid.io/metafile-indexer。
---

# metafs-indexer

## Base URL

所有请求的基础路径为：**`https://file.metaid.io/metafile-indexer`**（不要使用其他 domain）。

## 查询用户信息

根据 **address**、**metaid** 或 **globalMetaID** 任选一种方式查询，使用 `/api/info/*` 路径（MetaID 兼容格式）：

| 查询依据      | 路径 |
|---------------|------|
| address       | `GET /api/info/address/:address` |
| metaid        | `GET /api/info/metaid/:metaidOrGlobalMetaId`（同时支持 metaid 或 globalMetaId） |
| globalMetaID  | `GET /api/info/globalmetaid/:globalMetaID` |

- 成功响应：`{ "code": 1, "data": MetaIDUserInfo }`。
- 展示用字段：`globalMetaId`, `metaid`, `name`, `address`, `avatar`, `avatarId`。其中 `avatar` 为相对路径如 `/content/{avatarPinId}`，`avatarId` 即头像的 pinId。

也可使用 v1 路径：`/api/v1/users/address/:address`、`/api/v1/users/metaid/:metaId`（v1 的 metaid 不支持 globalMetaId，需单独用 `/api/info/globalmetaid/:globalMetaID`）。v1 响应为 `{ "code": 0, "data": IndexerUserInfo }`，头像字段为 `avatarPinId`。

## 头像展示

- **判断是否有头像**：用户信息中 `avatarId`（MetaID 格式）或 `avatarPinId`（v1）非空即有头像。
- **头像图片 URL**（任选其一）：
  - `{BASE}/content/{avatarPinId}`（推荐，根路径）
  - `{BASE}/api/v1/users/avatar/content/{pinId}`
- 示例：`https://file.metaid.io/metafile-indexer/content/abc123...`
- 在 Markdown 中展示：`![avatar](https://file.metaid.io/metafile-indexer/content/{avatarPinId})`

## 根据 pinId 查询文件

1. **文件元数据**：`GET /api/v1/files/:pinId` → 返回 IndexerFileResponse（pinId、name、size、contentType 等）。
2. **文件内容**：
   - 直接内容：`GET /api/v1/files/content/:pinId` → 二进制流，按 Content-Type/文件名处理。
   - 加速（重定向 OSS）：`GET /api/v1/files/accelerate/content/:pinId` → 307 重定向，适合前端或下载链接。

流程：先用 `/api/v1/files/:pinId` 取元数据，再按需调用 content 或 accelerate 获取内容或下载链接。

## 使用请求脚本

技能提供可执行脚本 `scripts/query_indexer.py`，对上述 Base URL 发起 GET 请求，无需手写 HTTP 调用。

- **查用户**（三选一）：
  - `python3 scripts/query_indexer.py user --address <address>`
  - `python3 scripts/query_indexer.py user --metaid <metaid>`
  - `python3 scripts/query_indexer.py user --globalmetaid <globalMetaID>`
- **查文件**：
  - `python3 scripts/query_indexer.py file --pinid <pinId>`

脚本内 Base URL 固定为 `https://file.metaid.io/metafile-indexer`；可通过环境变量 `METAFS_INDEXER_BASE_URL` 覆盖（如本地或测试环境）。

- **输出**：stdout 为完整 JSON（便于管道处理，如 `| jq`）；摘要行打印到 stderr：有头像时输出 `AVATAR_URL=<完整头像图片 URL>`，查文件时输出 `CONTENT_URL=` 与 `ACCELERATE_URL=`。从摘要行即可得到头像展示链接或文件内容/加速下载链接。

## 参考资料

完整 API 路径与响应字段见 [references/api.md](references/api.md)。
