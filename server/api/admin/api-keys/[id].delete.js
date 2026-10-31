import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import { deleteApiKey } from '#server/services/api-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da chave de API não fornecido.'
    })
  }

  try {
    await deleteApiKey(id)
    return {
      success: true,
      message: 'Chave de API removida com sucesso.'
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erro ao remover chave de API.'
    })
  }
})

