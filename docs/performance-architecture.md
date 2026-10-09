# 性能架构：Notion 编辑 × Cloudflare 读者面

> **怎么管任务：** GitHub Issues 管可执行工单；较长设计与决策写在 `docs/`（本文件）。Projects 看板只做状态流转（Todo / Doing / Done），**不能替代文档**。Issue 正文应链回本文件。

- 生产域名：[`https://izelzzz.com`](https://izelzzz.com)（自定义域；勿再依赖 `*.workers.dev` 作对外入口）
- 仓库：[`Izelzzz/izelzzzzz`](https://github.com/Izelzzz/izelzzzzz)
- 看板：GitHub Project **izelzzz performance**（创建后把下方 Issues 放进 Todo）

---

## 1. 原则：Notion = 编辑器，不是线上源站

继续用 Notion 当 CMS **完全合理**（写作、标签、封面都方便）。问题是把 Notion 当成读者路径上的**实时源站**：

| 角色 | 应该做什么 | 不该做什么 |
|------|------------|------------|
| Notion | 唯一编辑入口 | 每次访客请求都直连 API |
| Cloudflare Worker (OpenNext) | 出 HTML / 读边缘缓存 | 无缓存地当 Notion 代理 |
| R2 / KV / D1（演进） | 读者数据面、媒体镜像 | — |

读者路径应尽快变成「边缘 HIT」；Notion 只在 miss、revalidate 或后台同步 job 里被打。

---

## 2. 当前架构（As-is）

```
浏览器 → Cloudflare Worker (OpenNext / izelzzzzz)
              ├─ 首页 / 文章页：代码上有 ISR/revalidate，但未配 R2 增量缓存
              │                 → 常表现为 x-nextjs-cache: MISS，仍可能打 Notion
              ├─ /blog：getStaticProps 吐空列表 → 浏览器再调 /api → 再打 Notion
              └─ 媒体：hero ~9MB；封面常为 Notion 签名 URL 或大图（会过期 / 很重）
Notion ←── 未命中或 API 调用时当源站
```

已知后果：

1. **ISR 在 CF 上基本未真正 HIT**（缺 OpenNext R2 incremental cache + DO queue）。
2. **`/blog` 首屏多一跳**，体验与 SEO/无 JS 降级都差。
3. **媒体过重 + 签名 URL**，LCP 与裂图风险并存。
4. ~~`workers.dev` 在大陆不可达~~ → 已用自定义域 `izelzzz.com` 解决访问层问题（与性能正交）。

---

## 3. 目标架构（To-be）

```
你写文 → Notion（唯一编辑入口）
              │
              │  webhook / 定时 / ISR revalidate
              ▼
        Cloudflare 数据面（R2 增量缓存 → 镜像图 → 可选 KV/D1）
              │
              ▼
浏览器 → Worker 只读缓存 / 静态页（快、稳、可 CDN）
```

分阶段：

| 阶段 | 名称 | Notion 在读者链上？ |
|------|------|---------------------|
| P0 | 半同步：真 ISR + 服务端列表 + 静态/媒体止血 | 偶尔（miss 时） |
| P1 | 按需同步：webhook revalidate + 图镜像 + API 收紧 | 很少 |
| P2 | 全同步：Notion → R2/KV/D1 为读者真相源 | 仅同步 job |

---

## 4. 工作项与 Issues

### P0 — 本周（半同步）

| Issue | 标题 |
|-------|------|
| [#6](https://github.com/Izelzzz/izelzzzzz/issues/6) | Enable OpenNext R2 incremental cache + DO queue so ISR actually HITs |
| [#7](https://github.com/Izelzzz/izelzzzzz/issues/7) | Make `/blog` server ISR first page (like home) |
| [#8](https://github.com/Izelzzz/izelzzzzz/issues/8) | Compress `synapse-hero.mp4` (~720p / ~1MB) + poster |
| [#9](https://github.com/Izelzzz/izelzzzzz/issues/9) | `public/_headers` immutable for `/_next/static/*` |
| [#10](https://github.com/Izelzzz/izelzzzzz/issues/10) | （soft）`Cache-Control` on `/api/notion-blog-posts` |

涉及文件提示：`open-next.config.ts`、`wrangler.jsonc`、`pages/blog.js`、`public/`、`pages/api/notion-blog-posts.js`。

### P1 — 接着（按需同步）

| Issue | 标题 |
|-------|------|
| [#11](https://github.com/Izelzzz/izelzzzzz/issues/11) | Memoize Notion `data_source_id` + tighten private filter |
| [#12](https://github.com/Izelzzz/izelzzzzz/issues/12) | Notion webhook → on-demand revalidate |
| [#13](https://github.com/Izelzzz/izelzzzzz/issues/13) | Mirror covers/block images to R2 + rewrite URLs |
| [#14](https://github.com/Izelzzz/izelzzzzz/issues/14) | （editorial）Prefer ≤400KB covers in Notion |

### P2 — 流量起来再上（全同步）

| Issue | 标题 |
|-------|------|
| [#15](https://github.com/Izelzzz/izelzzzzz/issues/15) | Hybrid sync：Notion → R2/KV/D1 as reader source of truth |

---

## 5. Labels 与看板

仓库 Labels：

- `p0` / `p1` / `p2` — 优先级
- `performance` — 性能相关

GitHub Project：**izelzzz performance**

- 列：`Todo` → `Doing` → `Done`
- 用法：开 PR 时把对应 Issue 移到 Doing；合并/验收后 Done
- Issue 用 `Fixes #n` 关联；设计细节仍以本文件为准

---

## 6. 编辑侧约定（P1 editorial）

在工程镜像完善前，Notion 封面优先：

- 体积 **≤ 400KB**
- 建议 WebP 或压缩 JPEG，宽边约 1200–1600
- 避免直接丢未压缩手机原图 / 超大 Unsplash

---

## 7. 何时可以考虑离开 Notion

个人博客通常做到 P1/P2 就够。只有在这些情况下才值得换 CMS/MDX：

- 需要复杂组件 / MDX / 多作者工作流
- Notion API 限流或稳定性已经挡路
- 同步成本高于换栈成本

在那之前：**Notion 继续写，Cloudflare 负责读。**

---

## 8. 相关链接

- 部署说明：[`DEPLOY.md`](../DEPLOY.md)
- 平台规格：[`docs/specs/blog-platform.md`](./specs/blog-platform.md)
- OpenNext Cloudflare：incremental cache / R2 / DO queue（以当前 `@opennextjs/cloudflare` 文档为准）


---

## 9. OpenNext R2 增量缓存 + DO queue（Issue #6）

生产 Worker 名：`izelzzz`（与 Cloudflare Dashboard 服务名一致；仓库名仍为 Izelzzz/izelzzzzz）。本仓库已在 `open-next.config.ts` / `wrangler.jsonc` 接上：

| 组件 | 绑定名 | 资源 |
|------|--------|------|
| R2 incremental cache | `NEXT_INC_CACHE_R2_BUCKET` | bucket `izelzzzzz-next-inc-cache` |
| Worker self reference | `WORKER_SELF_REFERENCE` | service `izelzzz` |
| DO revalidation queue | `NEXT_CACHE_DO_QUEUE` | class `DOQueueHandler`（migration tag `v1`） |

`open-next.config.ts` 使用 `r2IncrementalCache` + `withRegionalCache({ mode: "long-lived" })` + `doQueue`。Pages Router 仅时间基 `revalidate` 时不需要 D1/DO tag cache；On-demand（`revalidatePath` / webhook）留到 P1。

### Cloudflare 控制台一次性步骤

1. 打开 [Cloudflare Dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2)，若未开通 R2 先启用。
2. 创建 bucket，名称必须与 `wrangler.jsonc` 一致：`izelzzzzz-next-inc-cache`（或先改配置里的 `bucket_name` 再部署）。
3. 合并本改动到 `main` 后，Workers Builds 会按现有 `npm run deploy:cloudflare` 部署；DO migration `v1` / `DOQueueHandler` 由 Wrangler 随部署应用。
4. 也可本地（需 Node ≥ 22 + 已登录 wrangler）：
   ```bash
   npx wrangler r2 bucket create izelzzzzz-next-inc-cache
   npm run deploy:cloudflare
   ```

### 验收

```bash
# 首次可能 MISS；隔几秒再打第二次应出现 HIT
curl -sI https://izelzzz.com/ | grep -i x-nextjs-cache
curl -sI "https://izelzzz.com/blog/<某篇文章 id>" | grep -i x-nextjs-cache
```

期望：二次访问 `x-nextjs-cache: HIT`（或 STALE 后后台回填再 HIT）。Worker 日志 / Notion 侧应看到读者路径打 API 次数下降。

