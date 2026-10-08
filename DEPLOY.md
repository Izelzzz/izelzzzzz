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

在生产 Worker 的 secrets 中配置 `NOTION_TOKEN`。`NOTION_DATABASE_ID` 在 `wrangler.jsonc` 的 `vars` 中配置，部署时会成为 Worker 的运行时变量。

`npm run build:cloudflare` 会运行 OpenNext Cloudflare 适配器。适配器会调用项目的 `build` 脚本生成 Next.js standalone 输出，再生成 `.open-next/worker.js` 和静态资源目录。`npm run deploy:cloudflare` 会把这个 Worker 发布到 Cloudflare。Wrangler Preview 部署会使用仓库中的 `wrangler.jsonc` 和 `"previews": {}` 配置。

`wrangler.jsonc` 中的 `build.command` 固定为 `npm run build:cloudflare`，供本地 Wrangler 命令使用；Workers Builds 使用控制台中保存的 Build command，不读取 Wrangler 配置中的自定义构建命令。`preview_urls` 固定为 `true`，用于开启 `workers.dev` Preview URL。

`next` 和 `eslint-config-next` 当前固定为 `16.4.0`，OpenNext Cloudflare 适配器固定为 `1.20.9`。这组版本满足 Cloudflare 的 Next.js 自动配置要求，`package-lock.json` 必须和 `package.json` 一起提交。

## Workers 和 Pages 的分支行为

Workers Builds 的 Production branch 是生产部署分支，所以控制台中的分支选择器只允许选择一个分支。Build watch paths `*` 只表示监视这个分支中的所有路径，不表示监视所有分支。

生产部署使用 `main`。Workers Builds 的生产服务只配置 `main`，Deploy command 使用 `npm run deploy:cloudflare`。

现有 Workers Builds 项目需要完成一次 Worker Previews 切换。打开 Cloudflare 控制台的 **Workers & Pages > izelzzzzz > Settings > Builds**，在 **Set up Worker Previews** 中选择 **Set up**，配置 **Previews Base**，确认 Preview command 为 `npx wrangler preview`，然后选择 **Switch to Worker Previews**。切换完成后，任意非生产分支的构建都会创建独立 Preview，不需要先合并到 `main`。

Pull Request 预览使用 Workers Builds 的 Preview builds，Build command 设为 `npm run build:cloudflare`，Preview command 设为 `npx wrangler preview`。每个分支会获得一个稳定的 Preview URL，每次推送会更新这个 URL；每次部署还会生成一个独立的 Deployment URL。

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

Cloudflare 的 `Workers Builds: izelzzzzz` 是独立的外部检查。启用 Worker Previews 后，Pull Request 会收到 Preview URL 和构建状态评论；Production deploy command 继续使用 `npm run deploy:cloudflare`。

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
