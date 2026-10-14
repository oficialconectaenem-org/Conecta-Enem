import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireTeacher } from '#server/utils/require-teacher'
import prisma from '#server/utils/prisma'
import { essayCorrectionSchema } from '#shared/validators/essay'

export default defineEventHandler(async (event) => {
  const teacher = await requireTeacher(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID inválido.'
    })
  }

  const essay = await prisma.essay.findFirst({
    where: {
      id,
      classroom: {
        teacherId: teacher.id
      }
    }
  })

  if (!essay) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Redação não encontrada.'
    })
  }

  const validation = essayCorrectionSchema.safeParse(body)
  if (!validation.success) {
    const errorDetails = validation.error.flatten().fieldErrors
    throw createError({
      statusCode: 422,
      statusMessage: 'Valores de correção inválidos segundo as regras do ENEM.',
      data: { errors: errorDetails }
    })
  }

  const val = validation.data
  const totalScore = val.c1Score + val.c2Score + val.c3Score + val.c4Score + val.c5Score

  const correctionData = {
    c1Score: val.c1Score,
    c2Score: val.c2Score,
    c3Score: val.c3Score,
    c4Score: val.c4Score,
    c5Score: val.c5Score,
    totalScore,
    c1Comment: val.c1Comment || null,
    c2Comment: val.c2Comment || null,
    c3Comment: val.c3Comment || null,
    c4Comment: val.c4Comment || null,
    c5Comment: val.c5Comment || null,
    justification1: val.justification1 || val.c1Comment || null,
    justification2: val.justification2 || val.c2Comment || null,
    justification3: val.justification3 || val.c3Comment || null,
    justification4: val.justification4 || val.c4Comment || null,
    justification5: val.justification5 || val.c5Comment || null,
    positivePoints: val.positivePoints || null,
    improvements: val.improvements || null,
    generalComment: val.generalComment || val.generalFeedback || null,
    generalFeedback: val.generalFeedback || val.generalComment || null
  }

  // Upsert na correção
  const correction = await prisma.essayCorrection.upsert({
    where: { essayId: essay.id },
    create: {
      essayId: essay.id,
      teacherId: teacher.id,
      ...correctionData
    },
    update: {
      ...correctionData
    }
  })

  // Se o body indicar status ou se for finalização
  const newStatus = val.status || 'GRADED'
  await prisma.essay.update({
    where: { id: essay.id },
    data: { status: newStatus }
  })

  return {
    success: true,
    correction
  }
})
