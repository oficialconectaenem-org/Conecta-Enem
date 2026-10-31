import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { createApiKey } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  const provider = typeof body?.provider === 'string' ? body.provider.trim() : 'GEMINI'
  const model = typeof body?.model === 'string' && body.model.trim().length > 0 ? body.model.trim() : null
  const baseUrl = typeof body?.baseUrl === 'string' && body.baseUrl.trim().length > 0 ? body.baseUrl.trim() : null
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
      model,
      baseUrl,
      active
    })

    return {
      success: true,
      message: 'Chave de API cadastrada com sucesso!',
      key: {
        id: created.id,
        name: created.name,
        provider: created.provider,
        model: created.model,
        baseUrl: created.baseUrl,
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
