import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { testGeminiApiKey, getApiKeyById } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  let rawKey = ''

  if (body?.id) {
    const found = await getApiKeyById(body.id)
    if (!found) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Chave de API não encontrada.'
      })
    }
    rawKey = found.key
  } else if (typeof body?.key === 'string') {
    rawKey = body.key.trim()
  }

  if (!rawKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nenhuma chave fornecida para teste.'
    })
  }

  const result = await testGeminiApiKey(rawKey)
  return result
})

