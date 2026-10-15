import 'dotenv/config'
import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL não encontrada no ambiente.')
  }

  const parsed = new URL(connectionString)
  const pool = mariadb.createPool({
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || 'root'),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'conectar_enem',
    allowPublicKeyRetrieval: true
  })

  const adapter = new PrismaMariaDb(pool)
  const prisma = new PrismaClient({ adapter })

  const name = process.env.ADMIN_NAME || 'Administrador Conecta Enem'
  const email = (process.env.ADMIN_EMAIL || 'oficialconectaenem@gmail.com').trim().toLowerCase() 
  const password = process.env.ADMIN_PASSWORD || 'Admin@Conecta2026'

  console.log(`Verificando/Criando usuário administrador: ${email}`)

  const hashedPassword = hashPassword(password)

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    })

    if (existingUser) {
      console.log(`Usuário ${email} já existe. Atualizando para ADMIN e ativo...`)

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            role: 'ADMIN',
            active: true
          }
        })

        const credentialAccount = existingUser.accounts.find(
          (acc) => acc.providerId === 'credential'
        )

        if (credentialAccount) {
          await tx.account.update({
            where: { id: credentialAccount.id },
            data: {
              accountId: email,
              password: hashedPassword
            }
          })
        } else {
          await tx.account.create({
            data: {
              userId: existingUser.id,
              providerId: 'credential',
              accountId: email,
              password: hashedPassword
            }
          })
        }
      })

      console.log(`✔ Administrador ${email} atualizado com sucesso!`)
    } else {
      await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            role: 'ADMIN',
            active: true
          }
        })

        await tx.account.create({
          data: {
            userId: createdUser.id,
            providerId: 'credential',
            accountId: email,
            password: hashedPassword
          }
        })
      })

      console.log(`✔ Administrador ${email} criado com sucesso!`)
    }

    console.log('\n--- Credenciais de Acesso ---')
    console.log(`Email:    ${email}`)
    console.log(`Senha:    ${password}`)
    console.log(`Role:     ADMIN`)
    console.log(`Ativo:    true`)
    console.log('-----------------------------\n')
  } catch (error) {
    console.error('Erro ao executar o seed de administrador:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()

