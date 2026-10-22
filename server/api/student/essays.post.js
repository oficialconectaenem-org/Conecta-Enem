import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '#server/services/auth.service'
import prisma from '#server/utils/prisma'
import { essaySubmissionSchema } from '#shared/validators/essay'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !user.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuário não autenticado. Faça login novamente.'
    })
  }

  let body
  try {
    body = await readBody(event)
  } catch (err) {
    console.error('[Essays Post] Falha ao ler corpo da requisição:', err)
    throw createError({
      statusCode: 413,
      statusMessage: 'O tamanho dos dados enviados excedeu o limite aceito pelo servidor.'
    })
  }

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

  // Verificação defensiva de integridade da turma (evita erro P2003 de Foreign Key do Prisma)
  let validClassroomId = null
  if (classroomId && typeof classroomId === 'string' && classroomId.trim()) {
    try {
      const classroomExists = await prisma.classroom.findUnique({
        where: { id: classroomId.trim() },
        select: { id: true }
      })
      if (classroomExists) {
        validClassroomId = classroomExists.id
      } else {
        console.warn(`[Essays Post] Turma '${classroomId}' não encontrada. Salvando no histórico pessoal.`)
      }
    } catch (checkErr) {
      console.warn('[Essays Post] Erro ao verificar turma no banco:', checkErr)
    }
  }

  // Prevenção contra estouro de memória no banco com base64 gigante (> 8MB)
  if (submissionType === 'IMAGE' && imageUrl && imageUrl.length > 8 * 1024 * 1024) {
    throw createError({
      statusCode: 413,
      statusMessage: 'A imagem enviada é muito pesada (maior que 8MB). Por favor, capture uma nova foto com resolução padrão.'
    })
  }

  try {
    const essay = await prisma.essay.create({
      data: {
        studentId: user.id,
        classroomId: validClassroomId,
        theme: theme.trim(),
        title: title ? title.trim() : null,
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
  } catch (dbError) {
    console.error('[Essays Post] Erro ao salvar redação no banco:', dbError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro no banco de dados ao salvar a redação. Tente novamente em instantes.'
    })
  }
})
