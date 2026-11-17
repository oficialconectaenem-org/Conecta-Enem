import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

const globalForPrisma = globalThis

function getDatabaseConfig(connectionString) {
  try {
    const parsed = new URL(connectionString)
    const useSsl =
      parsed.searchParams.get('ssl-mode') === 'REQUIRED' ||
      parsed.searchParams.get('ssl') === 'true' ||
      parsed.hostname?.includes('aivencloud.com')

    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : ''

    const config = {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: dbName || (parsed.hostname?.includes('aivencloud.com') ? 'defaultdb' : 'conectaenem'),
      allowPublicKeyRetrieval: true,
      // No ambiente serverless da Vercel, limite baixo evita estourar o limite de conexões do Aiven (max ~20-25)
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 3),
      connectTimeout: 15000,
      acquireTimeout: 15000,
      idleTimeout: 30000
    }

    if (useSsl) {
      config.ssl = { rejectUnauthorized: false }
    }

    return config
  } catch {
    // Se a URL falhar ao parsear (ex: senhas com caracteres especiais sem encode),
    // tenta extrair via regex seguro antes de recorrer à string pura
    const regexMatch = connectionString.match(/^(?:mysql|mariadb):\/\/([^:]+):(.+)@([^:/]+)(?::(\d+))?(?:\/([^?]+))?(?:\?(.*))?$/)
    if (regexMatch) {
      const [, user, password, host, port, database, search] = regexMatch
      const isAiven = host.includes('aivencloud.com')
      const useSsl = isAiven || search?.includes('ssl-mode=REQUIRED') || search?.includes('ssl=true')

      const config = {
        host,
        port: port ? Number(port) : 3306,
        user: decodeURIComponent(user),
        password: decodeURIComponent(password),
        database: database || (isAiven ? 'defaultdb' : 'conectaenem'),
        allowPublicKeyRetrieval: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 3),
        connectTimeout: 15000,
        acquireTimeout: 15000,
        idleTimeout: 30000
      }

      if (useSsl) {
        config.ssl = { rejectUnauthorized: false }
      }

      return config
    }

    return connectionString
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL não encontrada no ambiente.')
  }

  const pool = mariadb.createPool(getDatabaseConfig(connectionString))
  const adapter = new PrismaMariaDb(pool)

  return new PrismaClient({
    adapter
  })
}

// Em serverless (Vercel) e dev, reutiliza o client em instâncias 'warm' para evitar recriar pools a cada request
const prisma =
  globalForPrisma.__conectarEnemPrisma ??
  createPrismaClient()

globalForPrisma.__conectarEnemPrisma = prisma

export default prisma
