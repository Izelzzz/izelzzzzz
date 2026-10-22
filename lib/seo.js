/**
 * Share / Open Graph helpers for crawlers.
 * Default image lives on this origin so cards never depend on Notion signed URLs.
 */

import { isImgixHost } from './cover'

export const SITE_NAME = '碳基生物Izel狂想曲'
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://izelzzz.com').replace(/\/$/, '')
export const DEFAULT_OG_IMAGE_PATH = '/og-default.webp'
export const DEFAULT_DESCRIPTION = '你正在窥看一个神秘碳基生物的精神世界。'

export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (pathOrUrl.startsWith('data:')) return `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_URL}${path}`
}

export function defaultOgImageUrl() {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH)
}

/**
 * Notion file covers often use short-lived signed S3 URLs — bad for share cards.
 * Prefer stable HTTPS hosts; otherwise fall back to the site default image.
 */
export function isStableShareImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('data:')) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase()

    if (host === 'izelzzz.com' || host.endsWith('.izelzzz.com')) return true
    if (host === 'images.unsplash.com' || host.endsWith('.unsplash.com')) return true
    if (isImgixHost(host)) return true
    // Built-in Notion page covers (not signed user uploads).
    if (host === 'app.notion.com' && u.pathname.startsWith('/images/page-cover/')) return true
    if (host === 'www.notion.so' && u.pathname.startsWith('/images/page-cover/')) return true

    // Everything else, including signed Notion / S3 file URLs that expire, falls back to the default image.
    return false
  } catch {
    return false
  }
}

export function resolveShareImageUrl(candidateUrl) {
  if (isStableShareImageUrl(candidateUrl)) return candidateUrl
  return defaultOgImageUrl()
}

/**
 * Props for <ShareMeta /> — keep values plain strings for SSR into <Head>.
 */
export function buildShareMeta({
  title,
  description,
  path,
  image,
  type = 'website',
} = {}) {
  const resolvedTitle = String(title || SITE_NAME).trim() || SITE_NAME
  const resolvedDescription = String(description || DEFAULT_DESCRIPTION).trim() || DEFAULT_DESCRIPTION
  const url = absoluteUrl(path || '/')
  const imageUrl = resolveShareImageUrl(image)

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    url,
    imageUrl,
    type,
    siteName: SITE_NAME,
  }
}
