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

    const config = {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'conectar_enem',
      allowPublicKeyRetrieval: true,
      connectionLimit: 10,
      connectTimeout: 10000
    }

    if (useSsl) {
      config.ssl = { rejectUnauthorized: false }
    }

    return config
  } catch {
    return {
      connectionString,
      allowPublicKeyRetrieval: true
    }
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL não encontrada.')
  }

  const pool = mariadb.createPool(getDatabaseConfig(connectionString))
  const adapter = new PrismaMariaDb(pool)

  return new PrismaClient({
    adapter
  })
}

const prisma =
  globalForPrisma.__conectarEnemPrisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__conectarEnemPrisma = prisma
}

export default prisma