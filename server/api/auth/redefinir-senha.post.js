import { createError, readBody } from 'h3'
import prisma from '#server/utils/prisma'
import { hashPassword } from '#server/services/auth.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body?.token
  const newPassword = body?.password

  if (!token || typeof token !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token de recuperação ausente ou inválido.'
    })
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A nova senha deve possuir pelo menos 8 caracteres.'
    })
  }

  // Busca o registro de verificação válido
  const verification = await prisma.verification.findFirst({
    where: {
      value: token,
      expiresAt: {
        gt: new Date()
      }
    }
  })

  if (!verification) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Link de recuperação inválido ou expirado. Por favor, solicite um novo link.'
    })
  }

  // Extrai o e-mail do identificador
  const identifier = verification.identifier
  if (!identifier.startsWith('password-reset:')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tipo de token de verificação inválido.'
    })
  }

  const email = identifier.replace(/^password-reset:/, '')

  // Busca o usuário correspondente
  const user = await prisma.user.findUnique({
    where: {
      email
    },
    include: {
      accounts: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuário não encontrado.'
    })
  }

  // Garantia de segurança: Administrador não pode redefinir senha por este endpoint
  if (user.role === 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Redefinição de senha não permitida para administradores.'
    })
  }

  // Criptografa a nova senha com scrypt + salt
  const hashedPassword = await hashPassword(newPassword)

  // Atualiza a conta de credenciais do usuário
  const credentialAccount = user.accounts.find(acc => acc.providerId === 'credential')
  if (credentialAccount) {
    await prisma.account.update({
      where: {
        id: credentialAccount.id
      },
      data: {
        password: hashedPassword
      }
    })
  } else {
    // Se por ventura não tiver registro de credencial, cria
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: hashedPassword
      }
    })
  }

  // Remove o token utilizado da tabela verifications para impedir reutilização
  await prisma.verification.delete({
    where: {
      id: verification.id
    }
  })

  // Invalida sessões ativas do usuário para forçar novo login com a nova senha
  await prisma.session.deleteMany({
    where: {
      userId: user.id
    }
  })

  return {
    success: true,
    message: 'Senha alterada com sucesso! Você já pode fazer login com sua nova senha.'
  }
})
