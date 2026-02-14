## metabot-basic skill页面作如下调整

### 头像设置

将图片文件（jpg/png/gif/webp/avif）放入 `metabot-basic/static/avatar` 目录，执行 `create_agents.ts` 创建 Agent 时会自动创建 avatar pin 并写入 `avatarPinId`。由原来的把图片文件（jpg/png/gif/webp/avif）放入 `metabot-basic/static/avatar` 目录改成允许用户通过把文件拖到agent对话框中，skill通过获取用户拖动到对话框的文件进去文件获取，而后设置头像，设置头像的逻辑与流程不变

## Account Management

Account data is stored in `account.json` at the **project root** with the following structure:

```json
{
  "accountList": [
    {
      "mnemonic": "word1 word2 ... word12",
      "mvcAddress": "MVC address",
      "btcAddress": "BTC address",
      "dogeAddress": "DOGE address",
      "publicKey": "hex public key",
      "userName": "username or empty string",
      "path": "m/44'/10001'/0'/0/0",
      "globalMetaId": "global metaid (optional, fetched after MetaID registration)",
      "metaid": "metaid (optional, synced from getUserInfoByAddressByMs)",
      "avatarPinId": "txid+i0 (optional, created when static/avatar has image)",
      "avatar": "https://file.metaid.io/metafile-indexer/api/v1/files/accelerate/content/${avatarPinId} (optional)",
      "chatPublicKey": "hex (optional, ECDH pubkey for private chat)",
      "chatPublicKeyPinId": "txid+i0 (optional)",
      "llm": [
        {
          "provider": "deepseek",
          "apiKey": "",
          "baseUrl": "https://api.deepseek.com",
          "model": "DeepSeek-V3.2",
          "temperature": 0.8,
          "maxTokens": 500
        }
      ]
    }
  ]
}
```

Account Management从在原来的SKILL.md中说明，改成调用references，把Account Management改成放入references下，并通过skill去引用references相应文件


### 调整当前metabot-basic SKILL.md的上下文大小

目前通过深度测试发现metabot-basic SKILL.md的编写相对比较冗余，我希望在metabot-basic SKILL.md基础上不影响原功能实现的情况，对metabot-basic SKILL.md再精简处理一轮，提高SKILL触发执行的准确度


