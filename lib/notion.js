import { Client } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export async function getDatabase(databaseId) {
  const res = await notion.databases.query({
    database_id: databaseId,
    page_size: 100,
    sorts: [{ property: '作成日時', direction: 'descending' }]
  })
  return res.results
}

export async function getPage(pageId) {
  return await notion.pages.retrieve({ page_id: pageId })
}
