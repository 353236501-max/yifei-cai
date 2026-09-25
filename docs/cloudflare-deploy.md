# Cloudflare Workers 部署

早觉雨大人，此项目包含动态网页和 API，请在 Cloudflare 的 Workers 中连接 GitHub 仓库 `353236501-max/yifei-cai`。

| 设置 | 值 |
| --- | --- |
| 根目录 | 仓库根目录（留空或 `/`） |
| 生产分支 | `main` |
| 构建命令 | `npm run build` |
| 部署命令 | `npm run deploy` |
| Node.js | `22.16.0`，仓库已提供 `.node-version` |
| Worker 名称 | `yifei-cai`（与 wrangler.jsonc 一致） |

如需要显式安装命令，使用 `npm ci`，并保留 devDependencies。不要选择静态 Pages 输出目录，`dist/client` 只有静态资源，不能独立运行 API。

## 数据资源

配置中的 `DB` 和 `BUCKET` 用于错题与图片。Wrangler 使用账号里的 `yifei-cai-study` 数据库和 `yifei-cai-study-images` 存储桶；不存在时请求自动创建。账号需要开通 R2，部署令牌需要 Workers、D1、R2 的相应权限。若日志提示 R2 未启用，请先在账号中启用后重试。

部署脚本随后应用 `drizzle/` 中的数据库迁移。已有数据不会被清空。若数据库迁移失败，网页可能已经上线，但记录功能仍未就绪；修复权限后重新部署。

在 Worker 的 Settings → Variables and Secrets 添加 Secret `STORAGE_KEY`：用下面命令在本机生成 32 字节随机值，不要提交到 GitHub，也不要在后续部署中替换已有密钥：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

没有 STORAGE_KEY 时课程和使用者自填 API 的对话仍可使用，错题加密保存和图片上传不可用。API Key 由访问者在页面填写，公开站点无需设置部署者的 DEEPSEEK_API_KEY。

## 原配置问题与验证边界

旧版本缺少根目录 Wrangler 配置，并把本地开发专用的 D1 占位 ID 和 `site-creator-r2` 写入生产构建。新版本把本地模拟资源与生产资源分开，明确 Worker 入口、资源名称、构建和部署命令。

本机 PDF 服务没有随此配置部署到云端；发布网页不会使访问者自动访问部署者电脑上的 PDF。原始教材、索引、个人数据和 .env 不上传。

部署后核对首页、模型设置、API 对话、错题保存与图片删除。若失败，保留从第一个 Error 开始的日志；本地构建和 dry-run 成功不等于账号侧部署成功。

参考：[Cloudflare Vite 部署配置](https://developers.cloudflare.com/workers/vite-plugin/get-started/)、[资源自动创建](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/)。
