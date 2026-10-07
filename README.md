# Carbon Izel Blog

一个使用 Next.js 和 Notion 内容库的个人博客。首页包含交互式视觉区域，博客页面通过服务端 API 读取公开文章。

## 本地运行

```bash
npm ci
cp .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。

本地环境变量：

| 变量 | 用途 |
| --- | --- |
| `NOTION_TOKEN` | 服务端访问 Notion 的集成令牌 |
| `NOTION_DATABASE_ID` | 博客文章数据库标识符 |

环境变量只在服务端使用。请勿将 `.env.local` 提交到 Git。

## 检查与构建

```bash
npm run lint
npm run build
```

GitHub Actions 会在推送和 Pull Request 中执行依赖安装、ESLint 检查和生产构建。

## 部署

完整部署步骤请阅读 [DEPLOY.md](./DEPLOY.md)。部署平台需要配置 `NOTION_TOKEN` 和 `NOTION_DATABASE_ID`。

可以运行 [scripts/configure-notion.sh](./scripts/configure-notion.sh) 引导配置本地环境和 GitHub Actions secrets。

## 项目文档

- [项目规格](./docs/specs/blog-platform.md)
- [部署说明](./DEPLOY.md)
