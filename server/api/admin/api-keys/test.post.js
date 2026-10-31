import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { testUniversalApiKey, getApiKeyById } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  let rawKey = ''
  let provider = body?.provider || 'GEMINI'
  let model = body?.model || null
  let baseUrl = body?.baseUrl || null

  if (body?.id) {
    const found = await getApiKeyById(body.id)
    if (!found) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Chave de API não encontrada.'
      })
    }
    rawKey = found.key
    provider = found.provider || provider
    model = found.model || model
    baseUrl = found.baseUrl || baseUrl
  } else if (typeof body?.key === 'string') {
    rawKey = body.key.trim()
  }

  if (!rawKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nenhuma chave fornecida para teste.'
    })
  }

  const result = await testUniversalApiKey({
    key: rawKey,
    provider,
    model,
    baseUrl
  })
  return result
})
