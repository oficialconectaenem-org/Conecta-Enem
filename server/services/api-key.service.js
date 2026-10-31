import prisma from '#server/utils/prisma'

let tableInitialized = false

export const PROVIDER_CONFIGS = {
  GEMINI: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    fallbackModels: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  OPENAI: {
    name: 'OpenAI (ChatGPT)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    fallbackModels: ['gpt-4o', 'gpt-4-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  DEEPSEEK: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    fallbackModels: ['deepseek-reasoner'],
    docsUrl: 'https://platform.deepseek.com/api_keys'
  },
  GROQ: {
    name: 'Groq (Ultra Rápido)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    fallbackModels: ['llama-3.1-8b-instant'],
    docsUrl: 'https://console.groq.com/keys'
  },
  OPENROUTER: {
    name: 'OpenRouter (Multi-Modelos)',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    fallbackModels: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat'],
    docsUrl: 'https://openrouter.ai/keys'
  },
  ANTHROPIC: {
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    fallbackModels: ['claude-3-5-sonnet-20241022'],
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  CUSTOM: {
    name: 'Personalizada / OpenAI-Compatível',
    defaultBaseUrl: '',
    defaultModel: '',
    docsUrl: ''
  }
}

/**
 * Garante que a tabela `api_keys` exista no banco e contenha as colunas necessárias
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
        \`model\` VARCHAR(191) NULL,
        \`base_url\` VARCHAR(191) NULL,
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

    // Inspeciona colunas existentes (compatível universalmente com MySQL 5.7+, MySQL 8 e MariaDB)
    try {
      const existingCols = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`api_keys\``)
      const colNames = Array.isArray(existingCols)
        ? existingCols.map(c => (c.Field || c.field || c.COLUMN_NAME || '').toLowerCase())
        : []

      if (!colNames.includes('model')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`api_keys\` ADD COLUMN \`model\` VARCHAR(191) NULL;`).catch(() => null)
      }
      if (!colNames.includes('base_url')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`api_keys\` ADD COLUMN \`base_url\` VARCHAR(191) NULL;`).catch(() => null)
      }
      if (!colNames.includes('provider')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE \`api_keys\` ADD COLUMN \`provider\` VARCHAR(191) NOT NULL DEFAULT 'GEMINI';`).catch(() => null)
      }
    } catch {
      // Fallback com ALTER direto caso SHOW COLUMNS falhe
      await prisma.$executeRawUnsafe(`ALTER TABLE \`api_keys\` ADD COLUMN \`model\` VARCHAR(191) NULL;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE \`api_keys\` ADD COLUMN \`base_url\` VARCHAR(191) NULL;`).catch(() => null)
    }

    tableInitialized = true
  } catch (err) {
    console.warn('[ApiKey Service] Aviso ao verificar tabela api_keys:', err.message)
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

  const envGemini = process.env.GEMINI_API_KEY
  const envOpenAI = process.env.OPENAI_API_KEY
  const envDeepseek = process.env.DEEPSEEK_API_KEY
  const envGroq = process.env.GROQ_API_KEY

  const hasEnvFallback = Boolean(
    (envGemini && envGemini.trim().length > 0) ||
    (envOpenAI && envOpenAI.trim().length > 0) ||
    (envDeepseek && envDeepseek.trim().length > 0) ||
    (envGroq && envGroq.trim().length > 0)
  )

  const items = keys.map(k => ({
    id: k.id,
    name: k.name,
    provider: (k.provider || 'GEMINI').toUpperCase(),
    model: k.model || null,
    baseUrl: k.baseUrl || null,
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
    envKeyMasked: hasEnvFallback ? maskKey(envGemini || envOpenAI || envDeepseek || envGroq) : null,
    availableProviders: Object.keys(PROVIDER_CONFIGS).map(key => ({
      id: key,
      ...PROVIDER_CONFIGS[key]
    }))
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
 * Cadastra uma nova chave de API (qualquer provedor)
 */
export async function createApiKey({ name, key, provider = 'GEMINI', model = null, baseUrl = null, active = true }) {
  await ensureApiKeysTable()

  const trimmedName = (name || '').trim()
  const trimmedKey = (key || '').trim()
  const normalizedProvider = (provider || 'GEMINI').toUpperCase()

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
      provider: normalizedProvider,
      model: model ? model.trim() : null,
      baseUrl: baseUrl ? baseUrl.trim() : null,
      active: Boolean(active)
    }
  })
}

/**
 * Atualiza uma chave de API existente
 */
export async function updateApiKey(id, { name, key, provider, model, baseUrl, active }) {
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

  if (model !== undefined) {
    data.model = model ? model.trim() : null
  }

  if (baseUrl !== undefined) {
    data.baseUrl = baseUrl ? baseUrl.trim() : null
  }

  if (active !== undefined) {
    data.active = Boolean(active)
    if (data.active) {
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
 * Testa qualquer chave de API (Gemini, OpenAI, DeepSeek, Groq, OpenRouter, Claude, Custom)
 */
export async function testUniversalApiKey({ key, provider = 'GEMINI', model = null, baseUrl = null }) {
  const rawKey = (key || '').trim()
  if (!rawKey) {
    return { valid: false, error: 'Chave não informada para teste.' }
  }

  const normalizedProvider = (provider || 'GEMINI').toUpperCase()
  const cfg = PROVIDER_CONFIGS[normalizedProvider] || PROVIDER_CONFIGS.CUSTOM
  const resolvedModel = model?.trim() || cfg.defaultModel
  const resolvedBaseUrl = (baseUrl?.trim() || cfg.defaultBaseUrl || '').replace(/\/+$/, '')

  const startTime = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 14000)

  try {
    let response = null

    if (normalizedProvider === 'GEMINI') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel || 'gemini-2.5-flash'}:generateContent?key=${rawKey}`
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 2 }
        }),
        signal: controller.signal
      })
    } else if (normalizedProvider === 'ANTHROPIC') {
      const url = `${resolvedBaseUrl || 'https://api.anthropic.com/v1'}/messages`
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': rawKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: resolvedModel || 'claude-3-5-haiku-20241022',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }]
        }),
        signal: controller.signal
      })
    } else {
      // Padrão OpenAI-Compatível: OpenAI, DeepSeek, Groq, OpenRouter, Custom
      const targetBase = resolvedBaseUrl || (
        normalizedProvider === 'DEEPSEEK' ? 'https://api.deepseek.com' :
        normalizedProvider === 'GROQ' ? 'https://api.groq.com/openai/v1' :
        normalizedProvider === 'OPENROUTER' ? 'https://openrouter.ai/api/v1' :
        'https://api.openai.com/v1'
      )
      const url = `${targetBase}/chat/completions`

      const headers = {
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json'
      }

      if (normalizedProvider === 'OPENROUTER') {
        headers['HTTP-Referer'] = 'https://conectaenem.com'
        headers['X-Title'] = 'Conecta Enem'
      }

      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: resolvedModel || (
            normalizedProvider === 'DEEPSEEK' ? 'deepseek-chat' :
            normalizedProvider === 'GROQ' ? 'llama-3.3-70b-versatile' :
            normalizedProvider === 'OPENROUTER' ? 'openai/gpt-4o-mini' :
            'gpt-4o-mini'
          ),
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        }),
        signal: controller.signal
      })
    }

    clearTimeout(timeoutId)
    const latencyMs = Date.now() - startTime

    if (response.ok) {
      return {
        valid: true,
        latencyMs,
        provider: normalizedProvider,
        message: `Chave de ${cfg.name} validada com sucesso! Resposta em ${latencyMs}ms.`
      }
    }

    const errData = await response.json().catch(() => ({}))
    const rawError = errData.error?.message || errData.message || `Erro HTTP ${response.status}`

    let userMessage = rawError
    if (rawError.includes('service account is deleted or disabled') || rawError.includes('service account bound to the API key') || rawError.includes('SERVICE_DISABLED') || rawError.includes('PERMISSION_DENIED')) {
      userMessage = `A chave do Google Gemini está vinculada a um projeto ou conta desativada no Google Cloud. Crie um novo projeto no Google AI Studio (https://aistudio.google.com/app/apikey) e cadastre uma nova chave.`
    } else if (rawError.includes('API key not valid') || rawError.includes('Incorrect API key') || rawError.includes('invalid_api_key')) {
      userMessage = `A chave de API para ${cfg.name} é inválida. Verifique os caracteres ou gere uma nova.`
    } else if (rawError.includes('insufficient_quota') || rawError.includes('RESOURCE_EXHAUSTED') || rawError.includes('Quota exceeded') || response.status === 429) {
      userMessage = `A chave é autêntica, porém o limite de cota / créditos em ${cfg.name} foi atingido (Rate Limit / Quota).`
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
        ? 'Tempo limite de conexão esgotado (14s). Verifique a URL e a internet.'
        : `Falha na requisição: ${err.message}`
    }
  }
}

/**
 * Retorna as chaves ativas prontas para uso ordenadas por saúde e rotatividade
 */
export async function getActiveApiKeys() {
  try {
    await ensureApiKeysTable()
    const dbKeys = await prisma.apiKey.findMany({
      where: {
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
        provider: (k.provider || 'GEMINI').toUpperCase(),
        key: k.key,
        model: k.model || null,
        baseUrl: k.baseUrl || null,
        fromDb: true
      }))
    }
  } catch (err) {
    console.warn('[ApiKey Service] Erro ao buscar chaves do banco, verificando .env:', err.message)
  }

  // Fallbacks do .env
  const envCandidates = [
    { provider: 'GEMINI', key: process.env.GEMINI_API_KEY, name: 'Google Gemini (.env)' },
    { provider: 'OPENAI', key: process.env.OPENAI_API_KEY, name: 'OpenAI (.env)' },
    { provider: 'DEEPSEEK', key: process.env.DEEPSEEK_API_KEY, name: 'DeepSeek (.env)' },
    { provider: 'GROQ', key: process.env.GROQ_API_KEY, name: 'Groq (.env)' }
  ]

  for (const c of envCandidates) {
    if (c.key && c.key.trim().length > 0) {
      return [{
        id: `env-${c.provider.toLowerCase()}`,
        name: c.name,
        provider: c.provider,
        key: c.key.trim(),
        model: null,
        baseUrl: null,
        fromDb: false
      }]
    }
  }

  return []
}

/**
 * Registra o resultado do uso da chave (sucesso ou erro)
 */
export async function recordKeyUsage(keyId, { success, error = null } = {}) {
  if (!keyId || keyId.startsWith('env-') || keyId === 'custom-key') return

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
    console.warn('[ApiKey Service] Erro ao registrar métricas da chave:', err.message)
  }
}
