# 安全响应头

生产站点 `https://izelzzz.com` 的每个响应都带上下面这组安全头。清单维护在 `lib/security-headers.js`。

## 配置位置

`wrangler.jsonc` 保持 `assets.run_worker_first` 为 Workers 的默认值（静态资源先于 Worker 返回）。因此同一份清单接到三条响应路径上：

1. **Worker 实际返回的响应**（页面、API、`/_next/image`）：`wrangler.jsonc` 的 `main` 是 `cloudflare/worker.js`。它调用 OpenNext 生成的 `.open-next/worker.js`，再把 `SECURITY_HEADERS` 写到返回的响应上。`/_next/image` 由 OpenNext 在进入 Next 服务器之前处理，所以这一层是该路由拿到安全头的位置。该路由同时保留 OpenNext 图片响应自己的 `Content-Security-Policy: script-src 'none'; frame-src 'none'; sandbox;`。
2. **Next 服务器**：`next.config.js` 的 `headers()` 对 `/(.*)` 发布同一份清单。本地 `next dev` / `next start`，以及 Cloudflare 上经过 Next 的页面和 API，都从这里得到这些头。
3. **Workers 静态资源**（`/_next/static/*`、`/og-default.webp`、`/videos/*` 以及其他 `public/` 文件）：`public/_headers` 的 `/*` 规则发布同一份头。`/_next/static/*` 继续使用 `Cache-Control: public, max-age=31536000, immutable`。

修改清单时按这个顺序做：

1. 编辑 `lib/security-headers.js`。
2. 运行 `node scripts/sync-public-headers.js`，重写 `public/_headers`。
3. 运行 `npm test`，确认 `next.config.js` 与 `public/_headers` 仍是同一份清单。

## 响应头

| 头 | 值 |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy-Report-Only` | 见下方允许列表 |

`Permissions-Policy` 关闭摄像头、麦克风和地理位置。`X-Frame-Options: SAMEORIGIN` 允许同源页面嵌套本站。

## CSP 允许列表

策略以报告模式发送，浏览器记录违规并继续加载页面。

| 指令 | 允许 | 依据 |
| --- | --- | --- |
| `default-src` | `'self'` | 未单列的资源类型回到本站 |
| `script-src` | `'self' 'unsafe-inline'` | 脚本来自 `/_next/static`。生产 HTML 含一段随构建变化的内联引导脚本 `globalThis.TURBOPACK.push(...)`，内容含 chunk 哈希，适合 `'unsafe-inline'` |
| `style-src` | `'self' 'unsafe-inline'` | 样式表来自 `/_next/static`。文章页把 Notion 文字颜色渲染成元素 `style` 属性 |
| `font-src` | `'self'` | 字体使用系统字体栈 |
| `img-src` | `'self' data: blob:`，以及 `https://*.unsplash.com`、`https://*.imgix.net`、`https://imgix.net`、`https://*.imgix.com`、`https://imgix.com`、`https://*.notion.so`、`https://notion.so`、`https://*.notion.com`、`https://*.notion-static.com`、`https://*.amazonaws.com` | 本站图片与封面 SVG data URI；`lib/cover.js` 会改写 Unsplash 与 imgix；`lib/seo.js` 承认 Notion 内置封面；Notion 上传文件是 `*.amazonaws.com` 上的签名 URL，旧文件在 `*.notion-static.com`。`blob:` 留给 Next Image |
| `media-src` | `'self'` | 首页视频是 `/videos/synapse-hero.webm` 与 `/videos/synapse-hero.mp4` |
| `connect-src` | `'self'` | 浏览器数据请求是本站 `/api/notion-blog-posts` |
| `frame-src` | `'none'` | Notion embed、bookmark、link preview 渲染成外链卡片 |
| `frame-ancestors` | `'self'` | 与 `X-Frame-Options: SAMEORIGIN` 一致 |
| `worker-src` | `'self'` | 页面脚本从本站加载并在本站执行 |
| `manifest-src` | `'self'` | 站点资源在本站 |
| `object-src` | `'none'` | 页面内容由 HTML 与同源脚本呈现 |
| `base-uri` | `'self'` | 基准地址保持本站 |
| `form-action` | `'self'` | 表单提交保持本站 |

Notion 文章里的外部图片若使用上述主机以外的域名，报告模式会记下该主机。把确认属于内容的主机补进 `img-src` 后再进入强制执行。

## 从报告模式改为强制执行

1. 用浏览器打开首页、文章列表、一篇带封面和文内图片的文章，以及 `/demo`。
2. 在开发者工具控制台阅读 `Content-Security-Policy-Report-Only` 违规。
3. 把确认属于真实内容的主机补进 `lib/security-headers.js`，运行 `node scripts/sync-public-headers.js` 和 `npm test`。
4. 这几条路径的控制台违规都对应已经写入允许列表的资源后，把该头的名字从 `Content-Security-Policy-Report-Only` 改为 `Content-Security-Policy`，再次同步 `public/_headers`，然后发布。
