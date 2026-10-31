import { defineEventHandler, readBody, createError } from 'h3'
import { correctEssayWithGemini } from '#server/services/gemini.service'
import { getAuthenticatedUser } from '#server/services/auth.service'
import { checkRateLimit } from '#server/utils/rate-limit'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  // 1. Rate limit: Protege cota e custos de IA contra requisições abusivas
  checkRateLimit(event, {
    keyPrefix: 'ai_corrigir_redacao',
    maxRequests: 5,
    windowMs: 60 * 1000
  })

  // 1. Autenticação estrita: Exige usuário autenticado (não permite anônimos consumirem cota)
  const user = await getAuthenticatedUser(event)

  const body = await readBody(event)

  const theme = typeof body?.theme === 'string' ? body.theme.trim() : ''
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : null
  const saveToHistory = Boolean(body?.saveToHistory)

  if (!theme) {
    throw createError({
      statusCode: 400,
      statusMessage: 'O tema da redação é obrigatório.'
    })
  }

  // 2. Validação de extensão textual: ENEM anula com nota zero textos insuficientes (< 70 palavras / < 7 linhas)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  if (!text || wordCount < 70) {
    throw createError({
      statusCode: 400,
      statusMessage: `Texto insuficiente para avaliação: a redação contém apenas ${wordCount} palavra(s). O edital oficial do ENEM exige no mínimo 7 linhas (mínimo de 70 palavras). Redações com menos de 70 palavras recebem nota zero por texto insuficiente.`
    })
  }

  try {
    // Chama o serviço de IA universal (utiliza rotação de chaves ativas do banco com failover automático)
    const customKey = typeof body?.apiKey === 'string' && body.apiKey.trim().length > 0 ? body.apiKey.trim() : undefined
    const result = await correctEssayWithGemini({
      theme,
      text,
      title,
      apiKey: customKey
    })

    let savedEssayId = null

    // 3. Salvar no histórico de forma atômica com Essay e EssayCorrection
    if (saveToHistory) {
      try {
        const evaluator = await prisma.user.findFirst({
          where: { role: { in: ['ADMIN', 'TEACHER'] } }
        }) || user

        const positivePointsStr = Array.isArray(result.positivePoints)
          ? result.positivePoints.join('\n')
          : (result.positivePoints || '')

        const improvementsStr = Array.isArray(result.improvements)
          ? result.improvements.join('\n')
          : (Array.isArray(result.improvementTips) ? result.improvementTips.join('\n') : (result.improvements || ''))

        const savedEssay = await prisma.$transaction(async (tx) => {
          const essay = await tx.essay.create({
            data: {
              studentId: user.id,
              theme,
              title,
              content: text,
              submissionType: 'TEXT',
              status: 'GRADED'
            }
          })

          await tx.essayCorrection.create({
            data: {
              essayId: essay.id,
              teacherId: evaluator.id,
              totalScore: Number(result.totalScore) || 0,
              c1Score: Number(result.c1Score) || 0,
              c2Score: Number(result.c2Score) || 0,
              c3Score: Number(result.c3Score) || 0,
              c4Score: Number(result.c4Score) || 0,
              c5Score: Number(result.c5Score) || 0,
              c1Comment: result.competencies?.c1?.feedback || '',
              c2Comment: result.competencies?.c2?.feedback || '',
              c3Comment: result.competencies?.c3?.feedback || '',
              c4Comment: result.competencies?.c4?.feedback || '',
              c5Comment: result.competencies?.c5?.feedback || '',
              generalComment: result.generalFeedback || '',
              generalFeedback: result.generalFeedback || '',
              positivePoints: positivePointsStr,
              improvements: improvementsStr
            }
          })

          return essay
        })

        savedEssayId = savedEssay.id
      } catch (dbError) {
        console.error('[AI Essay] Erro ao persistir redação no histórico via transação:', dbError)
      }
    }

    return {
      success: true,
      correction: result,
      savedEssayId,
      metadata: {
        timestamp: new Date().toISOString(),
        wordCount,
        paragraphCount: text.split(/\n+/).filter(p => p.trim().length > 0).length,
        characterCount: text.length
      }
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    console.error('[API AI Corretor] Erro na correção:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao processar a correção com inteligência artificial.'
    })
  }
})
