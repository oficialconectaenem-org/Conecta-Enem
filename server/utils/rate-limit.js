import { createError, getRequestIP } from 'h3'

const rateLimitStore = new Map()

// Limpeza automática periódica de registros antigos
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  if (timer?.unref) {
    timer.unref()
  }
}

/**
 * Validador de rate-limit em memória para proteção contra ataques de força bruta.
 * @param {import('h3').H3Event} event - Evento da requisição H3
 * @param {object} options
 * @param {string} [options.keyPrefix='auth'] - Prefixo do escopo
 * @param {number} [options.maxRequests=10] - Limite de requisições no intervalo
 * @param {number} [options.windowMs=60000] - Janela de tempo em milissegundos
 */
export function checkRateLimit(event, options = {}) {
  const {
    keyPrefix = 'auth',
    maxRequests = 10,
    windowMs = 60 * 1000
  } = options

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const key = `${keyPrefix}:${clientIp}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + windowMs
    }
    rateLimitStore.set(key, entry)
    return
  }

  entry.count += 1

  if (entry.count > maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    throw createError({
      statusCode: 429,
      statusMessage: `Muitas tentativas. Por favor, aguarde ${retryAfter} segundos para tentar novamente.`
    })
  }
}
