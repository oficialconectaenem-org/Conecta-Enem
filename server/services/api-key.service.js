import prisma from '#server/utils/prisma'

let tableInitialized = false

/**
 * Garante que a tabela `api_keys` exista no banco de dados
 */
export async function ensureApiKeysTable() {
  if (tableInitialized) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`api_keys\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`provider\` VARCHAR(191) NOT NULL DEFAULT 'GEMINI',
        \`name\` VARCHAR(191) NOT NULL,
        \`key\` TEXT NOT NULL,
        \`active\` BOOLEAN NOT NULL DEFAULT true,
        \`last_used_at\` DATETIME(3) NULL,
        \`error_count\` INTEGER NOT NULL DEFAULT 0,
        \`last_error\` TEXT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`api_keys_provider_idx\`(\`provider\`),
        INDEX \`api_keys_active_idx\`(\`active\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `)
    tableInitialized = true
  } catch (err) {
    // Se o banco estiver indisponível ou permissão restrita, loga aviso
    console.warn('[ApiKey Service] Aviso ao verificar/criar tabela api_keys:', err.message)
  }
}

/**
 * Mascara uma chave de API para exibição segura no frontend
 */
export function maskKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return ''
  const trimmed = rawKey.trim()
  if (trimmed.length <= 10) return '••••••••'
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`
}

/**
 * Lista todas as chaves de API cadastradas
 */
export async function listApiKeys({ includeSecrets = false } = {}) {
  await ensureApiKeysTable()
  const keys = await prisma.apiKey.findMany({
    orderBy: [
      { active: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  const envKey = process.env.GEMINI_API_KEY
  const hasEnvFallback = Boolean(envKey && envKey.trim().length > 0)

  const items = keys.map(k => ({
    id: k.id,
    name: k.name,
    provider: k.provider,
    active: k.active,
    lastUsedAt: k.lastUsedAt,
    errorCount: k.errorCount,
    lastError: k.lastError,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    maskedKey: maskKey(k.key),
    key: includeSecrets ? k.key : undefined
  }))

  return {
    keys: items,
    hasEnvFallback,
    envKeyMasked: hasEnvFallback ? maskKey(envKey) : null
  }
}

/**
 * Retorna uma chave específica por ID
 */
export async function getApiKeyById(id) {
  await ensureApiKeysTable()
  return prisma.apiKey.findUnique({
    where: { id }
  })
}

/**
 * Cadastra uma nova chave de API
 */
export async function createApiKey({ name, key, provider = 'GEMINI', active = true }) {
  await ensureApiKeysTable()

  const trimmedName = (name || '').trim()
  const trimmedKey = (key || '').trim()

  if (!trimmedName) {
    throw new Error('O nome identificador da chave de API é obrigatório.')
  }
  if (!trimmedKey) {
    throw new Error('A chave de API é obrigatória.')
  }

  return prisma.apiKey.create({
    data: {
      name: trimmedName,
      key: trimmedKey,
      provider: provider.toUpperCase(),
      active: Boolean(active)
    }
  })
}

/**
 * Atualiza uma chave de API existente
 */
export async function updateApiKey(id, { name, key, provider, active }) {
  await ensureApiKeysTable()

  const existing = await prisma.apiKey.findUnique({
    where: { id }
  })

  if (!existing) {
    throw new Error('Chave de API não encontrada.')
  }

  const data = {}
  if (name !== undefined) {
    const trimmedName = name.trim()
    if (!trimmedName) throw new Error('O nome não pode ser vazio.')
    data.name = trimmedName
  }

  if (key !== undefined && key.trim().length > 0) {
    data.key = key.trim()
  }

  if (provider !== undefined) {
    data.provider = provider.toUpperCase()
  }

  if (active !== undefined) {
    data.active = Boolean(active)
    if (data.active) {
      // Reativar a chave zera os erros anteriores para dar nova chance
      data.errorCount = 0
      data.lastError = null
    }
  }

  return prisma.apiKey.update({
    where: { id },
    data
  })
}

/**
 * Remove uma chave de API
 */
export async function deleteApiKey(id) {
  await ensureApiKeysTable()
  return prisma.apiKey.delete({
    where: { id }
  })
}

/**
 * Testa uma chave de API do Gemini fazendo uma requisição rápida de verificação
 */
export async function testGeminiApiKey(rawKey) {
  const keyToTest = (rawKey || '').trim()
  if (!keyToTest) {
    return {
      valid: false,
      error: 'Chave não informada para teste.'
    }
  }

  const startTime = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    // Testa com modelo estável leve
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToTest}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'ping' }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 2
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const latencyMs = Date.now() - startTime

    if (response.ok) {
      return {
        valid: true,
        latencyMs,
        message: `Chave válida! Resposta da IA recebida em ${latencyMs}ms.`
      }
    }

    const errorData = await response.json().catch(() => ({}))
    const rawError = errorData.error?.message || `Erro HTTP ${response.status}`

    let userMessage = rawError
    if (rawError.includes('API key not valid') || rawError.includes('API_KEY_INVALID')) {
      userMessage = 'A chave de API informada é inválida. Verifique os caracteres ou gere uma nova no Google AI Studio.'
    } else if (rawError.includes('service account is deleted or disabled')) {
      userMessage = 'Esta chave pertence a um projeto do Google Cloud desativado. Gere uma nova chave em outro projeto.'
    } else if (rawError.includes('RESOURCE_EXHAUSTED') || rawError.includes('Quota exceeded')) {
      userMessage = 'A chave é válida, mas o limite gratuito de requisições por minuto foi atingido. Aguarde um instante.'
    }

    return {
      valid: false,
      latencyMs,
      error: userMessage
    }
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted')
    return {
      valid: false,
      error: isTimeout
        ? 'Tempo limite de conexão esgotado (12s). Verifique sua conexão com a internet.'
        : `Falha na requisição: ${err.message}`
    }
  }
}

/**
 * Retorna a lista de chaves ativas prontas para uso ordenadas para rotação saudável
 */
export async function getActiveGeminiKeys() {
  try {
    await ensureApiKeysTable()
    const dbKeys = await prisma.apiKey.findMany({
      where: {
        provider: 'GEMINI',
        active: true
      },
      orderBy: [
        { errorCount: 'asc' }, // Prioriza chaves sem erros recentes
        { lastUsedAt: 'asc' }  // Rotaciona (a menos usada recentemente tem prioridade)
      ]
    })

    if (dbKeys && dbKeys.length > 0) {
      return dbKeys.map(k => ({
        id: k.id,
        name: k.name,
        key: k.key,
        fromDb: true
      }))
    }
  } catch (err) {
    console.warn('[ApiKey Service] Erro ao buscar chaves do banco de dados, usando fallback .env:', err.message)
  }

  // Fallback: se não houver nenhuma chave no banco, usa a do .env
  const envKey = process.env.GEMINI_API_KEY
  if (envKey && envKey.trim().length > 0) {
    return [
      {
        id: 'env-fallback',
        name: 'Chave Padrão (.env)',
        key: envKey.trim(),
        fromDb: false
      }
    ]
  }

  return []
}

/**
 * Registra o resultado do uso da chave (sucesso ou erro)
 */
export async function recordKeyUsage(keyId, { success, error = null } = {}) {
  if (!keyId || keyId === 'env-fallback') return

  try {
    if (success) {
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          lastUsedAt: new Date(),
          errorCount: 0,
          lastError: null
        }
      })
    } else {
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          lastUsedAt: new Date(),
          errorCount: { increment: 1 },
          lastError: error ? String(error).slice(0, 500) : 'Erro desconhecido'
        }
      })
    }
  } catch (err) {
    console.warn('[ApiKey Service] Não foi possível atualizar métricas da chave:', err.message)
  }
}

