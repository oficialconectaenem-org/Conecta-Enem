import prisma from '#server/utils/prisma'
import mariadb from 'mariadb'

export default defineEventHandler(async () => {
  const connectionString = process.env.DATABASE_URL || ''
  let host = ''
  let port = 3306
  let database = ''
  let user = ''

  try {
    const parsed = new URL(connectionString)
    host = parsed.hostname
    port = parsed.port ? Number(parsed.port) : 3306
    database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : ''
    user = parsed.username
  } catch {
    const m = connectionString.match(/^(?:mysql|mariadb):\/\/([^:]+):(?:.+)@([^:/]+)(?::(\d+))?(?:\/([^?]+))?/)
    if (m) {
      user = m[1]
      host = m[2]
      port = m[3] ? Number(m[3]) : 3306
      database = m[4] || ''
    }
  }

  // Teste 1: Conexão direta com mariadb para pegar o erro de rede/credencial exato
  let directConnection = null
  let directError = null
  try {
    const isAiven = host.includes('aivencloud.com')
    let pass = ''
    try {
      pass = new URL(connectionString).password
    } catch {
      const pm = connectionString.match(/^(?:mysql|mariadb):\/\/[^:]+:([^@]+)@/)
      pass = pm ? pm[1] : ''
    }

    const conn = await mariadb.createConnection({
      host,
      port,
      user,
      password: decodeURIComponent(pass),
      database: database || (isAiven ? 'defaultdb' : 'conectaenem'),
      connectTimeout: 7000,
      ssl: { rejectUnauthorized: false }
    })
    directConnection = 'success'
    await conn.end()
  } catch (err) {
    directConnection = 'failed'
    directError = {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState
    }
  }

  // Teste 2: Teste via Prisma
  let prismaResult = null
  let prismaError = null
  try {
    const count = await prisma.user.count()
    prismaResult = { success: true, count }
  } catch (err) {
    prismaError = {
      message: err.message,
      code: err.code,
      cause: err.cause ? (err.cause.message || String(err.cause)) : null
    }
  }

  return {
    hasDatabaseUrl: Boolean(connectionString),
    config: {
      host: host ? `${host.slice(0, 4)}...${host.slice(-15)}` : null,
      fullHost: host,
      port,
      database,
      user
    },
    directConnection,
    directError,
    prismaResult,
    prismaError
  }
})

