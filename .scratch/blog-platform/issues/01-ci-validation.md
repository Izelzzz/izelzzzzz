# 01: 建立持续集成验证

**What to build:** 每次 Pull Request 和受支持分支推送后，GitHub 自动安装锁定依赖、运行代码检查并验证生产构建，维护者可以在合并前看到明确结果。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 工作流在 Pull Request、`main`、`feature/**` 和 `codex/**` 推送时运行。
- [ ] 工作流使用 Node.js 20 和 `npm ci`。
- [ ] 工作流执行 `npm run lint` 和 `npm run build`，任一步失败都使检查失败。
- [ ] 工作流只申请读取仓库内容的权限，并限制单次运行时间。
