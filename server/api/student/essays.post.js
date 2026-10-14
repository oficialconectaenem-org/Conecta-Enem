import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '#server/services/auth.service'
import prisma from '#server/utils/prisma'
import { essaySubmissionSchema } from '#shared/validators/essay'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  const body = await readBody(event)

  const validation = essaySubmissionSchema.safeParse(body)
  if (!validation.success) {
    const errorDetails = validation.error.flatten().fieldErrors
    const firstErrorMessage =
      validation.error.issues?.[0]?.message || 'Dados da redação inválidos.'

    throw createError({
      statusCode: 422,
      statusMessage: firstErrorMessage,
      data: { errors: errorDetails }
    })
  }

  const { theme, title, classroomId, submissionType, content, imageUrl } = validation.data

  const essay = await prisma.essay.create({
    data: {
      studentId: user.id,
      classroomId: classroomId || null,
      theme,
      title: title || null,
      content: submissionType === 'TEXT' ? content : null,
      imageUrl: submissionType === 'IMAGE' ? imageUrl : null,
      submissionType,
      status: 'PENDING'
    }
  })

  return {
    success: true,
    essay
  }
})
