/**
 * Homepage copy. Source of truth is the profile README at
 * https://github.com/Izelzzz/izelzzz — keep the two in step when either changes.
 */

export const INTRO = [
  '我是 Izel，一个带着产品思维做东西的人，着迷于 AI、软件与人的创造力交汇的地方。',
  '我从产品设计起步，做过开发者工具，带过工程团队，现在正往 AI 原生的软件开发里走得更深。',
  '我关心的不只是 AI 能做什么，更是怎样在它周围搭出可靠的系统。我喜欢把模糊的想法做成看得见的产品，质疑默认的前提，弄清事物在底层是怎么运转的。',
]

export const PIPELINE = ['质疑', '规格', '构建', '验证', '发布']

export const PRINCIPLES = [
  {
    title: '先质疑，再动手',
    text: '最便宜的功能，是那个本来就不必存在的功能。先判断一个想法值不值得做，再问怎么做。',
  },
  {
    title: '先有标准，再有代码',
    text: '规格和验收标准事先约定，「完成」是一个可以核对的事实，而不是一种感觉。',
  },
  {
    title: '交付物胜过对话',
    text: '每个 agent 只做一件事，靠文件交接而不是聊天记录。上下文保持小，每一步都可审计。',
  },
  {
    title: '模型不给自己打分',
    text: '评审来自全新的上下文，最好是另一个模型，只读规格和 diff。',
  },
  {
    title: '证据胜过自信',
    text: '一个结论要能指向某行源码、某次测试结果或某次运行才算数。证明不了的，就明说。',
  },
  {
    title: '不可逆的事由人负责',
    text: '合并、部署，以及决定什么重要，始终由我来做。',
  },
]

export const PROJECTS = [
  {
    name: 'Morgan-review',
    href: 'https://github.com/Izelzzz/Morgan-review',
    kind: '多 agent PR 评审',
    text: '自托管的多 agent PR 评审服务。各维度的评审者并行找问题，验证者复查每一条发现，代码再确认每处引用，之后才发出评论。',
  },
  {
    name: 'Eos-workbench',
    href: 'https://github.com/Izelzzz/Eos-workbench',
    kind: 'Claude Code mod',
    text: '以黎明女神命名。/eos 唤起一条从规格到部署的价值流流水线，每个阶段都有人工审批关口和流动指标。',
  },
  {
    name: 'izel-skill',
    href: 'https://github.com/Izelzzz/izel-skill',
    kind: 'Agent 技能包',
    text: '给 agent 用的可执行产品管理技能。先判断一个想法值不值得做，再细化、调研，写出产品规格和技术规格。',
  },
]

export const STACK = [
  { label: '语言', items: ['Python', 'TypeScript'] },
  { label: '交付', items: ['Git', 'GitHub Actions', 'Docker', 'Cloudflare'] },
  { label: '工作台', items: ['Claude Code', 'Codex', 'Cursor', 'Figma'] },
]

export const BEYOND = [
  { title: '壁球', text: '一项对抗性的运动，不断提醒我纪律、应变和决策。' },
  { title: '音乐', text: 'Jazz、R&B 和 Funk。一直在找有意思的节奏。' },
  { title: '游戏', text: '偏爱剧情向的作品：有情感深度，有立得住的角色，有关于爱的故事。' },
  { title: '思考与探索', text: '关于人之存在的更深处：意识、意义，以及内在的世界。' },
]

export const CONTACTS = [
  { label: 'GitHub', value: 'github.com/Izelzzz', href: 'https://github.com/Izelzzz' },
  { label: 'X', value: '@izelzzz', href: 'https://x.com/izelzzz' },
  { label: '邮箱', value: '965670101@qq.com', href: 'mailto:965670101@qq.com' },
]
