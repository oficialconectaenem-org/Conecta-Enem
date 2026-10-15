import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '#server/services/auth.service.js'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  const body = await readBody(event)

  if (!body.questionId || !body.option) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da questão e alternativa são obrigatórios.'
    })
  }

  const question = await prisma.question.findUnique({
    where: { id: body.questionId }
  })

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Questão não encontrada.'
    })
  }

  const normalizedSelected = String(body.option).toUpperCase()
  const isCorrect = normalizedSelected === String(question.correctAnswer).toUpperCase()

  // Remove resposta anterior do mesmo usuário para essa questão
  await prisma.questionAnswer.deleteMany({
    where: {
      userId: user.id,
      questionId: body.questionId
    }
  })

  // Registra a nova resposta no banco
  const answer = await prisma.questionAnswer.create({
    data: {
      userId: user.id,
      questionId: body.questionId,
      option: normalizedSelected,
      isCorrect
    }
  })

  return {
    success: true,
    data: {
      questionId: body.questionId,
      selected: answer.option,
      correct: answer.isCorrect,
      answeredAt: answer.createdAt
    }
  }
})
