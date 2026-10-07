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
- Build command：`npm run build`
- Build watch paths：`*`
- Node.js version：`20`

在生产环境变量中配置：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

`next` 和 `eslint-config-next` 当前固定为 `14.2.35`。Cloudflare 的 Next.js 自动配置要求至少使用这个版本，`package-lock.json` 必须和 `package.json` 一起提交。

## Workers 和 Pages 的分支行为

Workers Builds 的 Production branch 是生产部署分支，所以控制台中的分支选择器只允许选择一个分支。Build watch paths `*` 只表示监视这个分支中的所有路径，不表示监视所有分支。

生产部署使用 `main`。Pull Request 需要预览环境时，在 Workers Builds 设置中打开 Preview deployments，并选择全部非生产分支；如果当前账户界面没有这个选项，为每个需要长期预览的分支创建独立 Worker 服务，并把该服务的 Production branch 设置为对应分支。

不要在当前项目中直接使用 Cloudflare Pages。Pages 适合 `output: 'export'` 的纯静态 Next.js 站点，当前项目的 API Routes 和 Notion 服务端令牌不满足这个条件。

## GitHub Actions 与 Cloudflare 检查

`.github/workflows/ci.yml` 会在 Pull Request 中执行：

```bash
npm ci
npm run lint
npm run build
```

Cloudflare 的 `Workers Builds: izelzzzzz` 是独立的外部检查。依赖版本修正后，推送新的 PR 提交即可触发 Cloudflare 重新构建。若控制台仍然只构建旧提交，需要在 Workers 服务的 Git 设置中重新连接 GitHub 仓库，确认构建命令和 Production branch 指向当前仓库。

当只需要 GitHub Actions 校验、不需要每个 Pull Request 生成 Cloudflare 预览时，可以关闭 Workers Builds 的 Preview deployments，并从 GitHub 分支保护规则的 required checks 中移除 `Workers Builds: izelzzzzz`。`CI / validate` 继续作为 Pull Request 必需检查。

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
