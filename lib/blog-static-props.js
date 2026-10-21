const NOTION_PAGE_ID = /^[0-9a-f]{32}$/i
const NOTION_PAGE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// These responses mean this id is not a public article. Timeouts, 401, 429 and
// 5xx stay out of this set so a Notion outage fails the render instead of
// pinning a 404 onto a real post.
const MISSING_STATUS = new Set([400, 403, 404])
const MISSING_CODE = new Set([
  'object_not_found',
  'restricted_resource',
  'validation_error',
  'invalid_request_url',
  'invalid_request',
  'notionhq_client_invalid_path_parameter',
])

const ARTICLE_REVALIDATE_SECONDS = 3600

export function isNotionPageId(id) {
  const value = String(id ?? '')
  return NOTION_PAGE_ID.test(value) || NOTION_PAGE_UUID.test(value)
}

export function isDefiniteMissingPage(error) {
  if (!error || typeof error !== 'object') return false
  if (typeof error.code === 'string' && MISSING_CODE.has(error.code)) return true
  if (typeof error.status === 'number' && MISSING_STATUS.has(error.status)) return true
  return false
}

function missingPage() {
  // No revalidate. Next hands OpenNext a null cache value, and that adapter
  // deletes the key instead of writing an ISR entry.
  return { notFound: true }
}

function warnIfNotionForbidden(pageId, error) {
  const status = error?.status
  const code = error?.code
  if (status !== 403 && code !== 'restricted_resource') return
  const safeCode = typeof code === 'string' ? code : ''
  const safeStatus = typeof status === 'number' ? status : ''
  console.warn(
    `[blog] notion 403 treated as not found pageId=${pageId} status=${safeStatus} code=${safeCode}`,
  )
}

export async function loadBlogStaticProps(id, readers) {
  const pageId = String(id ?? '')
  if (!isNotionPageId(pageId)) return missingPage()

  let page
  try {
    page = await readers.getPage(pageId)
  } catch (error) {
    // Only the page retrieve can mean "this article does not exist".
    // Block-tree failures stay thrown so Next keeps the previous ISR entry.
    if (isDefiniteMissingPage(error)) {
      warnIfNotionForbidden(pageId, error)
      return missingPage()
    }
    throw error
  }
  if (!page) return missingPage()

  const blocks = await readers.getBlockTree(pageId)
  return {
    props: {
      page,
      blocks,
    },
    revalidate: ARTICLE_REVALIDATE_SECONDS,
  }
}
