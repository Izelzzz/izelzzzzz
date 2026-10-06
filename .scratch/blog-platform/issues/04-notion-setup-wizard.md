# 04: 提供 Notion 配置向导

**What to build:** 新维护者运行一个交互式脚本，按照指引从 Notion 集成和数据库页面获取配置，将本地值写入 `.env.local`，并将 CI 所需值写入 GitHub Actions secrets。

**Blocked by:** 01: 建立持续集成验证, 02: 补充项目入口文档

**Status:** ready-for-agent

- [ ] 向导引导创建或选择 Notion integration，并隐藏读取令牌。
- [ ] 向导引导获取博客数据库 ID，并将其作为普通配置写入。
- [ ] 向导把令牌和数据库 ID 写入 `.env.local`，重复运行不会生成重复键。
- [ ] 向导在 `gh` 可用且已登录时设置 GitHub secrets，否则明确记录人工后续步骤。
- [ ] 向导通过 `bash -n` 检查，并在 README 中提供运行入口。
