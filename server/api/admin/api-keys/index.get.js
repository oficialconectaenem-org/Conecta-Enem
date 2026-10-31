import { defineEventHandler } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { listApiKeys } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return listApiKeys({ includeSecrets: false })
})

