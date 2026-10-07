# 部署说明

## 当前项目选择 Cloudflare Workers

当前项目使用 Next.js Pages Router，并且包含以下服务端功能：

- `pages/api/notion-blog-posts.js` 和 `pages/api/notion-blog-post.js` 需要运行时处理请求。
- `NOTION_TOKEN` 只允许在服务端读取。
- `pages/blog/[id].js` 需要服务端读取 Notion 文章和内容块。

因此当前项目应当部署到 Cloudflare Workers。Workers 能够运行 Next.js 服务端代码，Pages 更适合静态导出站点。将这个项目直接改成 Pages 静态导出会移除 API Routes 和服务端环境变量能力。

## Cloudflare Workers Builds 配置

在 Cloudflare 控制台的 Workers 服务中配置：

- Production branch：`main`
- Root directory：仓库根目录
- Build command：`npm run build:cloudflare`
- Deploy command：`npm run deploy:cloudflare`
- Build watch paths：`*`
- Node.js version：`20`

在生产环境变量中配置：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

`npm run build:cloudflare` 会运行 OpenNext Cloudflare 适配器。适配器会调用项目的 `build` 脚本生成 Next.js standalone 输出，再生成 `.open-next/worker.js` 和静态资源目录。`npm run deploy:cloudflare` 会把这个 Worker 发布到 Cloudflare。Wrangler Preview 部署会使用仓库中的 `wrangler.jsonc` 和 `"previews": {}` 配置。

`wrangler.jsonc` 中的 `build.command` 也固定为 `npm run build:cloudflare`。这样 `npx wrangler preview` 或 `npx wrangler deploy` 在检查 `main` 入口文件前会自动生成 OpenNext 产物。

`next` 和 `eslint-config-next` 当前固定为 `16.4.0`，OpenNext Cloudflare 适配器固定为 `1.20.9`。这组版本满足 Cloudflare 的 Next.js 自动配置要求，`package-lock.json` 必须和 `package.json` 一起提交。

## Workers 和 Pages 的分支行为

Workers Builds 的 Production branch 是生产部署分支，所以控制台中的分支选择器只允许选择一个分支。Build watch paths `*` 只表示监视这个分支中的所有路径，不表示监视所有分支。

生产部署使用 `main`。Workers Builds 的生产服务只配置 `main`，Deploy command 使用 `npm run deploy:cloudflare`。

生产部署使用 `main`、`npm run build:cloudflare` 和 `npm run deploy:cloudflare`。Pull Request 预览使用 Workers Builds 的 Preview deployments，构建命令仍设为 `npm run build:cloudflare`，部署命令设为 `npx wrangler preview`。该命令会为非生产分支创建 Workers Preview，不会改变 `main` 的生产 Worker。

在 Workers Preview base config 中设置非敏感变量 `NOTION_DATABASE_ID`，并在 Preview secrets 中设置 `NOTION_TOKEN`。生产 Worker 的变量和 secret 仍在 Production environment 中单独配置。这样预览 Worker 不需要把 Notion 凭据写入仓库。

不要在当前项目中直接使用 Cloudflare Pages。Pages 适合 `output: 'export'` 的纯静态 Next.js 站点，当前项目的 API Routes 和 Notion 服务端令牌不满足这个条件。

## GitHub Actions 与 Cloudflare 检查

`.github/workflows/ci.yml` 会在 Pull Request 中执行：

```bash
npm ci
npm run lint
npm run build
```

`npm run build` 验证 Next.js 构建，Cloudflare Workers Builds 使用 `npm run build:cloudflare` 验证 OpenNext Worker 构建产物。

Cloudflare 的 `Workers Builds: izelzzzzz` 是独立的外部检查。生产服务只监听 `main` 时，建议在 Workers Builds 设置中关闭 Preview deployments，并从 GitHub 分支保护规则的 required checks 中移除这个外部检查；Pull Request 继续使用 `CI / validate`。这样 PR 不会因为生产 Worker 的部署设置失败而阻塞。

若需要 Cloudflare 为 Pull Request 建立预览，在现有 Workers Builds 服务中开启 Preview deployments，并将 Preview deploy command 设为 `npx wrangler preview`。Production deploy command 继续使用 `npm run deploy:cloudflare`。

## Vercel 和静态托管

Vercel 也支持当前 Next.js 应用。使用 Vercel 时配置相同的环境变量，并使用：

```bash
npm ci
npm run build
```

根目录的 `index.html` 和 `style.css` 是独立的静态页面。它们可以部署到 Netlify 或 GitHub Pages，但这不会部署 Next.js 博客和 Notion API。

## 本地环境变量

将 Notion 令牌写入本地 `.env.local`，不要提交该文件：

```text
NOTION_TOKEN=...
NOTION_DATABASE_ID=...
```
