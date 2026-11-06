import { defineEventHandler, readBody, createError } from 'h3'
import { generateRandomEssayThemeWithAI } from '#server/services/gemini.service'
import { getAuthenticatedUser } from '#server/services/auth.service'
import { checkRateLimit } from '#server/utils/rate-limit'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  // 1. Rate Limit para proteção de cota
  checkRateLimit(event, {
    keyPrefix: 'ai_gerar_tema',
    maxRequests: 20,
    windowMs: 60 * 1000
  })

  // 2. Autenticação obrigatória
  await getAuthenticatedUser(event)

  const body = await readBody(event).catch(() => ({}))
  const axis = typeof body?.axis === 'string' ? body.axis.trim() : null
  const customInstruction = typeof body?.customInstruction === 'string' ? body.customInstruction.trim() : null
  const saveToDb = body?.saveToDb !== false

  try {
    const generated = await generateRandomEssayThemeWithAI({
      axis,
      customInstruction
    })

    let savedId = `ai-theme-${Date.now()}`

    // 3. Persiste no banco de dados para enriquecer o acervo oficial
    if (saveToDb) {
      try {
        const savedTopic = await prisma.essayTopic.create({
          data: {
            title: generated.title,
            axis: generated.axis,
            description: generated.description,
            motivationText: JSON.stringify(generated.motivators),
            active: true
          }
        })
        savedId = savedTopic.id
      } catch (dbErr) {
        console.warn('[API Gerar Tema] Aviso ao persistir tema gerado no banco:', dbErr.message)
      }
    }

    return {
      success: true,
      theme: {
        id: savedId,
        ...generated
      }
    }
  } catch (error) {
    if (error.statusCode) throw error
    console.error('[API Gerar Tema IA] Erro ao gerar proposta:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao gerar proposta temática com inteligência artificial.'
    })
  }
})

