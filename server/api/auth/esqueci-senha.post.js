import { randomBytes } from 'node:crypto'
import { createError, readBody, getHeader } from 'h3'
import prisma from '#server/utils/prisma'
import { sendPasswordResetEmail } from '#server/services/email.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawEmail = body?.email
  const rawRole = body?.role

  if (!rawEmail || typeof rawEmail !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Por favor, informe seu e-mail.'
    })
  }

  const normalizedEmail = rawEmail.trim().toLowerCase()

  // Busca o usuário no banco de dados
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    }
  })

  // Regra de Negócio Estrita: Admin NÃO pode usar recuperação de senha pública
  if (user && user.role === 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Recuperação de senha não permitida para administradores do sistema.'
    })
  }

  // Se o usuário existir e for Aluno ou Professor
  if (user && (user.role === 'STUDENT' || user.role === 'TEACHER')) {
    if (!user.active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Esta conta está desativada. Entre em contato com o suporte.'
      })
    }

    // Se informou papel específico no front, valida se confere
    if (rawRole && (rawRole === 'STUDENT' || rawRole === 'TEACHER') && user.role !== rawRole) {
      const expectedRole = user.role === 'TEACHER' ? 'Professor' : 'Aluno'
      throw createError({
        statusCode: 400,
        statusMessage: `Este e-mail está cadastrado como ${expectedRole}. Selecione a opção correta.`
      })
    }

    // Gera token criptograficamente seguro de 64 caracteres
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora de validade

    // Remove tokens anteriores deste e-mail para evitar conflitos
    await prisma.verification.deleteMany({
      where: {
        identifier: `password-reset:${normalizedEmail}`
      }
    })

    // Registra o token no banco de dados (tabela verifications)
    await prisma.verification.create({
      data: {
        identifier: `password-reset:${normalizedEmail}`,
        value: token,
        expiresAt
      }
    })

    // Determina a URL base da aplicação
    const config = useRuntimeConfig()
    const origin = getHeader(event, 'origin') || config.public?.siteUrl || 'http://localhost:3000'
    const baseUrl = origin.replace(/\/$/, '')
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`

    // Dispara o e-mail de recuperação
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        role: user.role
      })
    } catch (err) {
      console.error('[Esqueci Senha API] Erro ao enviar e-mail:', err)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao enviar e-mail de recuperação. Verifique as configurações de e-mail do servidor.'
      })
    }
  }

  return {
    success: true,
    message: 'Se o e-mail estiver cadastrado como Aluno ou Professor, você receberá um link de recuperação em instantes!'
  }
})
