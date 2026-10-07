#!/usr/bin/env bash
#
# 本地 Notion 与 GitHub Actions 配置向导。
# library 部分来自 wizard skill 的模板；STAGES 区域包含项目步骤。

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

TOTAL_STAGES=0
_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env.local}"
WRITTEN_ENV=()
WRITTEN_SECRET=()
SKIPPED=()

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  浏览器中的登录、集成创建和复制操作由你完成。%s\n' "$DIM" "$RESET"
  pause "准备开始？"
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say() { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if command -v wslview >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open >/dev/null 2>&1; then open "$url"
    else warn "无法自动打开浏览器，请手动访问：$url"; fi
  } >/dev/null 2>&1 || warn "无法自动打开浏览器，请手动访问：$url"
}

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-按 Enter 继续}" "$RESET"
  read -r _ || true
}

_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line
  line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter 保留当前值]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter 保留当前值]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

write_env() {
  local key="$1" value="$2" temp
  touch "$ENV_FILE"
  temp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$temp" || true
  printf '%s=%s\n' "$key" "$value" >> "$temp"
  mv "$temp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ 写入%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ 设置%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name（稍后运行：gh secret set $name）")
  warn "无法设置 GitHub secret $name，请稍后手动设置"
}

finish() {
  _clear
  printf '\n%s%s  ✓ 配置完成%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} )) && note "已写入 $ENV_FILE：${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "已设置 GitHub secrets：${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "仍需人工完成："
    for item in "${SKIPPED[@]}"; do note "  - $item"; done
  fi
  printf '\n'
}

TOTAL_STAGES=3

banner "Notion 博客配置"

stage "创建或选择 Notion integration"
say "需要一个可访问博客数据库的 Notion integration。"
open_url "https://www.notion.so/my-integrations"
step "登录 Notion，创建或选择 integration，复制 Internal Integration Secret。"
step "在博客数据库的 Connections 设置中连接该 integration。"
ask_secret NOTION_TOKEN "粘贴 Notion Internal Integration Secret："

stage "获取博客数据库 ID"
say "数据库 ID 会公开作为应用配置使用，内容权限仍由 Notion integration 控制。"
open_url "https://www.notion.so"
step "打开博客文章数据库，复制页面 URL 中的 32 位 database ID。"
step "确认该数据库已连接到上一步的 integration。"
ask NOTION_DATABASE_ID "粘贴博客数据库 ID："

stage "写入本地环境和 GitHub Actions secrets"
write_env NOTION_TOKEN "$NOTION_TOKEN"
write_env NOTION_DATABASE_ID "$NOTION_DATABASE_ID"
set_secret NOTION_TOKEN "$NOTION_TOKEN"
set_secret NOTION_DATABASE_ID "$NOTION_DATABASE_ID"
note "本地环境文件已被 Git 忽略；令牌不会写入仓库文件。"

finish
