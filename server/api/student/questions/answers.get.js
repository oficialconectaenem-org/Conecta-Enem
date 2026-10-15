import { defineEventHandler } from 'h3'
import { getAuthenticatedUser } from '#server/services/auth.service.js'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)

  const answers = await prisma.questionAnswer.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const answersMap = {}
  answers.forEach((a) => {
    if (!answersMap[a.questionId]) {
      answersMap[a.questionId] = {
        selected: a.option,
        correct: a.isCorrect,
        answeredAt: a.createdAt
      }
    }
  })

  return {
    success: true,
    answers: answersMap
  }
})
