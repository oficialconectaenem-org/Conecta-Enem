import { defineEventHandler, readBody } from 'h3'
import { getAuthenticatedUser } from '#server/services/auth.service.js'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  const body = await readBody(event)

  if (!body.questionId) {
    return { success: false }
  }

  await prisma.questionAnswer.deleteMany({
    where: {
      userId: user.id,
      questionId: body.questionId
    }
  })

  return {
    success: true
  }
})
