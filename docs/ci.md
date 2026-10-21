# CI 门禁

仓库是 JS/JSX。GitHub 检查全绿表示 `npm run lint`、`npm test` 与 `npm run build:cloudflare` 已通过。Preview 可访问性、Notion 运行时和 CWV 目标在第 2 层和第 3 层确认。

工作流文件：`.github/workflows/ci.yml`。

## 合入前必须成立的事

### 1. 必过 CI（GitHub Actions，自动）

- `npm run lint`
- `npm test`
- `npm run build:cloudflare`

这三项为绿之后，Pull Request 可以合入 `preview`。

### 2. Preview 验收（团队人工）

需要运行时确认的改动，团队在把 Preview 提升到 `main` 之前确认：

- Preview URL 可以访问
- 关键用户路径可用
- 运行时配置和外部服务（例如 Notion）在 Preview 上的行为符合预期

Cloudflare Workers Builds 会自动给出部署结果、Preview URL 和构建状态评论。团队用这些结果完成这一层验收。

### 3. 发布后验证（团队人工）

发布之后，团队确认生产环境健康、CWV 与性能，以及可观测性（包括 Cloudflare trace）。Workers Builds 会产出这些观测记录，团队用它们做发布后检查。

## 依赖更新

Dependabot 按周为根目录的 npm 依赖开启 Pull Request。`next`、`eslint-config-next`、`@opennextjs/cloudflare`、`wrangler` 以及配套的 OpenNext / Cloudflare 工具放在同一个更新 PR 里。依赖更新 PR 合入前通过第 1 层必过 CI。后续可以在同一合入流程上增加依赖审计。

## GitHub 何时运行

- 推送到 `main`、`feature/**`、`bugfix/**`、`chore/**` 时运行。
- 所有 Pull Request 都运行，包括以 `preview` 为基线或来源的 PR。

运行环境为 `ubuntu-latest`，Node.js 20，使用 `npm ci` 安装锁定依赖。工作流权限为 `contents: read`，同一 ref 上新的运行会取消进行中的旧运行，单次超时 10 分钟。`actions/checkout` 与 `actions/setup-node` 使用锁定的 commit SHA。
