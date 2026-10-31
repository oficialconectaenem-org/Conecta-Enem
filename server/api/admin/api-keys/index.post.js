import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { createApiKey, testGeminiApiKey } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  const provider = typeof body?.provider === 'string' ? body.provider.trim() : 'GEMINI'
  const active = body?.active !== undefined ? Boolean(body.active) : true

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'O nome da chave de API é obrigatório.'
    })
  }

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A chave de API é obrigatória.'
    })
  }

  try {
    const created = await createApiKey({
      name,
      key,
      provider,
      active
    })

    return {
      success: true,
      message: 'Chave de API cadastrada com sucesso!',
      key: {
        id: created.id,
        name: created.name,
        provider: created.provider,
        active: created.active,
        createdAt: created.createdAt
      }
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erro ao cadastrar chave de API.'
    })
  }
})

