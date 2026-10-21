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

export async function loadBlogStaticProps(id, getPublicPageData) {
  const pageId = String(id ?? '')
  if (!isNotionPageId(pageId)) return missingPage()

  try {
    const result = await getPublicPageData(pageId)
    if (!result) return missingPage()
    return {
      props: {
        page: result.page,
        blocks: result.blocks,
        error: null,
      },
      revalidate: ARTICLE_REVALIDATE_SECONDS,
    }
  } catch (error) {
    if (isDefiniteMissingPage(error)) return missingPage()
    throw error
  }
}
