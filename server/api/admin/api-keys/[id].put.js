import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { updateApiKey } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da chave de API não fornecido.'
    })
  }

  const body = await readBody(event)

  try {
    const updated = await updateApiKey(id, {
      name: body.name,
      key: body.key,
      provider: body.provider,
      active: body.active
    })

    return {
      success: true,
      message: 'Chave de API atualizada com sucesso!',
      key: {
        id: updated.id,
        name: updated.name,
        provider: updated.provider,
        active: updated.active,
        updatedAt: updated.updatedAt
      }
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erro ao atualizar chave de API.'
    })
  }
})

