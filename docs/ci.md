# CI 门禁

仓库是 JS/JSX。GitHub Actions 负责合入前的静态检查和可复现构建；Cloudflare Workers Builds 与团队验收负责发布和线上证据。

工作流文件：`.github/workflows/ci.yml`。

## 门禁表

| 归属 | 级别 | 检查 |
| --- | --- | --- |
| GitHub Actions | 必过 | `npm run lint`、`npm run build:cloudflare` |
| GitHub Actions | 建议（后续可选） | 依赖审计 |
| Cloudflare Workers Builds 与团队验收 | 发布与线上证据 | 部署、Preview URL、CWV、trace |

必过项失败时，Pull Request 视为未通过。JS/JSX 工程的合入门禁是 ESLint 与 OpenNext Cloudflare 构建。

## GitHub 何时运行

- 推送到 `main`、`feature/**`、`bugfix/**`、`chore/**` 时运行。
- 所有 Pull Request 都运行，包括以 `preview` 为基线或来源的 PR。

运行环境为 `ubuntu-latest`，Node.js 20，使用 `npm ci` 安装锁定依赖。工作流权限为 `contents: read`，同一 ref 上新的运行会取消进行中的旧运行，单次超时 10 分钟。`actions/checkout` 与 `actions/setup-node` 使用锁定的 commit SHA。
