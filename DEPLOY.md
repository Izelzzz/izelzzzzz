# 网页部署说明

## 方式一：Vercel 部署（推荐，适合 Next.js 博客）

1. **登录 Vercel**（首次需要）：
   ```bash
   npx vercel login
   ```
   按提示用邮箱或 GitHub 登录。

2. **部署**：
   ```bash
   npm run build
   npx vercel --prod
   ```
   按提示选择或创建项目，完成后会得到一个线上地址，例如：`https://xxx.vercel.app`。

3. **关联 Git 后自动部署**  
   在 [vercel.com](https://vercel.com) 用 GitHub 导入本仓库，之后每次推送到主分支会自动构建并部署。

---

## 方式二：只部署根目录的静态页（index.html + style.css）

若只想上线根目录的「我的博客」静态页，可以：

- **Netlify**：把本仓库连到 [netlify.com](https://netlify.com)，构建命令留空，发布目录填 `.`，并把「首页」设为 `index.html`。  
  或本地安装 Netlify CLI 后执行：`netlify deploy --prod --dir=.`（只上传当前目录静态文件时需确保 Netlify 以静态站点方式发布根目录）。
- **GitHub Pages**：把 `index.html` 和 `style.css` 放到仓库的 `docs` 文件夹或单独分支，在仓库 Settings → Pages 里选择对应分支/目录即可。

---

## 环境变量（Next.js 博客用 Notion 时）

若博客使用 Notion 数据，在 Vercel 项目里配置：

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`（或你代码里用到的变量名）

路径：Vercel 项目 → Settings → Environment Variables。
