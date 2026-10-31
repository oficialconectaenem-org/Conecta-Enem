import { getActiveApiKeys, recordKeyUsage } from '#server/services/api-key.service'

/**
 * Serviço Universal de Inteligência Artificial para Correção Pedagógica de Redações do ENEM
 * Suporta múltiplos provedores com rotação dinâmica e failover automático:
 * - Google Gemini (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, etc.)
 * - OpenAI (gpt-4o, gpt-4o-mini, etc.)
 * - DeepSeek (deepseek-chat, deepseek-reasoner)
 * - Groq Cloud (llama-3.3-70b-versatile, mixtral-8x7b-32768, etc.)
 * - OpenRouter (multi-modelos com catálogo global)
 * - Anthropic Claude (claude-3-5-sonnet, claude-3-5-haiku)
 * - Provedores Personalizados / OpenAI-compatíveis (vLLM, Ollama, LM Studio, etc.)
 */

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
]

const AI_TIMEOUT_MS = 50000 // 50 segundos de tempo limite por chamada

export const SYSTEM_PROMPT = `Você é um corretor e avaliador sênior da banca oficial do ENEM (Exame Nacional do Ensino Médio), com profundo conhecimento da Matriz de Referência do ENEM e do Guia de Redação do Participante do INEP.

Sua missão é realizar uma correção técnica, minuciosa, pedagógica e construtiva da redação enviada pelo estudante.

REGRAS DE PONTUAÇÃO DO ENEM (0 A 1000 PONTOS):
O ENEM divide a nota em 5 Competências de 0 a 200 pontos cada.
A pontuação de cada competência DEVE OBRIGATORIAMENTE ser um dos níveis oficiais do INEP: 0, 40, 80, 120, 160 ou 200.
A nota total é a soma estrita das 5 competências (totalScore = c1Score + c2Score + c3Score + c4Score + c5Score).

Critérios de cada Competência:
- Competência 1 (Domínio da norma padrão escrita): Avalie desvios gramaticais (concordância, regência, crase, pontuação, ortografia, acentuação, separação silábica, paralelismo sintático) e escolhas de registro/vocabulário formal.
- Competência 2 (Compreensão do tema e repertório legitimado): Avalie a adequação ao tema (sem tangenciamento), aplicação de conceitos de outras áreas (repertório legítimo, pertinente e com uso produtivo) e estrutura dissertativo-argumentativa em 3 partes (introdução, desenvolvimento e conclusão).
- Competência 3 (Projeto de texto e argumentação): Avalie a coerência, projeto de texto estratégico, progressão temática, sustentação dos argumentos e capacidade de convencimento autoral (sem falhas graves de lógica ou lacunas).
- Competência 4 (Coesão e mecanismos linguísticos): Avalie conectivos inter e intraparágrafos, diversidade de operadores argumentativos, coesão referencial (pronomes, sinônimos para evitar repetições de palavras) e sequenciação de ideias.
- Competência 5 (Proposta de intervenção e direitos humanos): Avalie a presença dos 5 elementos obrigatórios:
  1. Agente (quem vai fazer?)
  2. Ação (o que vai ser feito?)
  3. Meio/Modo (como/por intermédio de quê?)
  4. Efeito/Finalidade (para quê/com qual objetivo?)
  5. Detalhamento (explicação extra de um dos elementos acima)
  Respeito aos Direitos Humanos é fundamental.

REGRAS ESPECIAIS DE ANULAÇÃO (NOTA ZERO TOTAL E EM TODAS AS COMPETÊNCIAS):
- Menos de 7 linhas manuscritas / texto insuficiente (se o texto tiver menos de 70 palavras ou for manifestamente insuficiente, zere todas as competências).
- Fuga total ao tema.
- Não obediência à estrutura dissertativo-argumentativa.
- Cópia descarada dos textos motivadores ou partes desconectadas.

FORMATO OBRIGATÓRIO DE RETORNO:
Sua resposta DEVE ser estritamente um objeto JSON válido, sem cercaduras Markdown, com a seguinte estrutura:
{
  "totalScore": number,
  "c1Score": number,
  "c2Score": number,
  "c3Score": number,
  "c4Score": number,
  "c5Score": number,
  "competencies": {
    "c1": {
      "score": number,
      "name": "Domínio da Norma Culta",
      "level": "string",
      "feedback": "string"
    },
    "c2": {
      "score": number,
      "name": "Compreensão da Proposta e Repertório",
      "level": "string",
      "feedback": "string"
    },
    "c3": {
      "score": number,
      "name": "Projeto de Texto e Argumentação",
      "level": "string",
      "feedback": "string"
    },
    "c4": {
      "score": number,
      "name": "Coesão e Recursos Linguísticos",
      "level": "string",
      "feedback": "string"
    },
    "c5": {
      "score": number,
      "name": "Proposta de Intervenção",
      "level": "string",
      "feedback": "string",
      "interventionElements": {
        "agente": boolean,
        "acao": boolean,
        "meioModo": boolean,
        "efeito": boolean,
        "detalhamento": boolean
      }
    }
  },
  "grammarErrors": [
    {
      "original": "string",
      "suggestion": "string",
      "explanation": "string",
      "type": "string",
      "line": 1
    }
  ],
  "positivePoints": [
    "string"
  ],
  "improvements": [
    "string"
  ],
  "generalFeedback": "string"
}`

export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    totalScore: { type: 'INTEGER' },
    c1Score: { type: 'INTEGER' },
    c2Score: { type: 'INTEGER' },
    c3Score: { type: 'INTEGER' },
    c4Score: { type: 'INTEGER' },
    c5Score: { type: 'INTEGER' },
    competencies: {
      type: 'OBJECT',
      properties: {
        c1: {
          type: 'OBJECT',
          properties: {
            score: { type: 'INTEGER' },
            name: { type: 'STRING' },
            level: { type: 'STRING' },
            feedback: { type: 'STRING' }
          },
          required: ['score', 'feedback']
        },
        c2: {
          type: 'OBJECT',
          properties: {
            score: { type: 'INTEGER' },
            name: { type: 'STRING' },
            level: { type: 'STRING' },
            feedback: { type: 'STRING' }
          },
          required: ['score', 'feedback']
        },
        c3: {
          type: 'OBJECT',
          properties: {
            score: { type: 'INTEGER' },
            name: { type: 'STRING' },
            level: { type: 'STRING' },
            feedback: { type: 'STRING' }
          },
          required: ['score', 'feedback']
        },
        c4: {
          type: 'OBJECT',
          properties: {
            score: { type: 'INTEGER' },
            name: { type: 'STRING' },
            level: { type: 'STRING' },
            feedback: { type: 'STRING' }
          },
          required: ['score', 'feedback']
        },
        c5: {
          type: 'OBJECT',
          properties: {
            score: { type: 'INTEGER' },
            name: { type: 'STRING' },
            level: { type: 'STRING' },
            feedback: { type: 'STRING' },
            interventionElements: {
              type: 'OBJECT',
              properties: {
                agente: { type: 'BOOLEAN' },
                acao: { type: 'BOOLEAN' },
                meioModo: { type: 'BOOLEAN' },
                efeito: { type: 'BOOLEAN' },
                detalhamento: { type: 'BOOLEAN' }
              },
              required: ['agente', 'acao', 'meioModo', 'efeito', 'detalhamento']
            }
          },
          required: ['score', 'feedback']
        }
      },
      required: ['c1', 'c2', 'c3', 'c4', 'c5']
    },
    grammarErrors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          suggestion: { type: 'STRING' },
          explanation: { type: 'STRING' },
          type: { type: 'STRING' },
          line: { type: 'INTEGER' }
        },
        required: ['original', 'suggestion', 'explanation']
      }
    },
    positivePoints: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    improvements: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    generalFeedback: { type: 'STRING' }
  },
  required: ['totalScore', 'c1Score', 'c2Score', 'c3Score', 'c4Score', 'c5Score', 'competencies', 'generalFeedback']
}

/**
 * Retorna objeto padrão de redação anulada com nota zero (critério oficial ENEM: texto insuficiente)
 */
export function getZeroScoreCorrection(wordCount, reason = 'Texto insuficiente (menos de 70 palavras / menos de 7 linhas)') {
  return {
    totalScore: 0,
    c1Score: 0,
    c2Score: 0,
    c3Score: 0,
    c4Score: 0,
    c5Score: 0,
    competencies: {
      c1: {
        score: 0,
        name: 'Domínio da Norma Culta',
        level: 'Nível 0 (0 pts)',
        feedback: 'Redação com produção textual insuficiente. De acordo com o edital do ENEM, textos com menos de 7 linhas manuscritas (menos de 70 palavras) recebem nota zero em todas as competências.'
      },
      c2: {
        score: 0,
        name: 'Compreensão da Proposta e Repertório',
        level: 'Nível 0 (0 pts)',
        feedback: 'Inviabilidade de avaliação de adequação temática e repertório sociocultural devido à extensão insuficiente.'
      },
      c3: {
        score: 0,
        name: 'Projeto de Texto e Argumentação',
        level: 'Nível 0 (0 pts)',
        feedback: 'Ausência de projeto de texto e sustentação argumentativa decorrente do número insuficiente de palavras.'
      },
      c4: {
        score: 0,
        name: 'Coesão e Recursos Linguísticos',
        level: 'Nível 0 (0 pts)',
        feedback: 'Inviabilidade de aferição dos recursos coesivos inter e intraparágrafos em virtude da brevidade do texto.'
      },
      c5: {
        score: 0,
        name: 'Proposta de Intervenção',
        level: 'Nível 0 (0 pts)',
        feedback: 'Não foi apresentada proposta de intervenção social completa com os 5 elementos necessários.',
        interventionElements: {
          agente: false,
          acao: false,
          meioModo: false,
          efeito: false,
          detalhamento: false
        }
      }
    },
    grammarErrors: [],
    positivePoints: [],
    improvements: [
      'Desenvolver a redação respeitando a extensão oficial exigida pelo ENEM (entre 8 e 30 linhas, com mais de 70 palavras).',
      'Estruturar o texto em 4 parágrafos consolidados: introdução com tese, dois desenvolvimentos argumentativos e conclusão com intervenção social.'
    ],
    generalFeedback: `Redação ANULADA com Nota Zero (0/1000). Motivo: ${reason}. O texto submetido possui apenas ${wordCount} palavra(s). O edital oficial do ENEM anula produções textuais de até 7 linhas / menos de 70 palavras.`
  }
}

/**
 * Utilitário de parsing seguro de JSON retornado por qualquer modelo de IA
 */
function parseAiJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Resposta vazia da IA.')
  }
  let cleaned = rawText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }
  try {
    return JSON.parse(cleaned)
  } catch (err) {
    throw new Error(`Falha ao decodificar JSON da IA: ${err.message}. Retorno bruto: ${cleaned.slice(0, 150)}...`)
  }
}

/**
 * Despacha chamada para a API correta de acordo com o provedor da chave
 */
async function callAiProvider(keyObj, userContent) {
  const provider = (keyObj.provider || 'GEMINI').toUpperCase()
  const rawKey = (keyObj.key || '').trim()

  if (provider === 'GEMINI') {
    const modelsToTry = keyObj.model
      ? [keyObj.model, ...GEMINI_MODELS.filter(m => m !== keyObj.model)]
      : GEMINI_MODELS

    let lastGeminiErr = null
    for (const model of modelsToTry) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`
        const payload = {
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userContent }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.2
          }
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const msg = errData.error?.message || `Erro HTTP ${res.status}`
          lastGeminiErr = new Error(msg)
          continue
        }

        const data = await res.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
        return parseAiJsonResponse(rawText)
      } catch (err) {
        clearTimeout(timeoutId)
        lastGeminiErr = err
      }
    }
    throw lastGeminiErr || new Error('Falha em todos os modelos do Google Gemini.')
  }

  if (provider === 'ANTHROPIC') {
    const targetModel = keyObj.model || 'claude-3-5-sonnet-20241022'
    const baseUrl = (keyObj.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
    const url = `${baseUrl}/messages`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': rawKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 4096,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }]
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.error?.message || `Erro Anthropic HTTP ${res.status}`
        throw new Error(msg)
      }

      const data = await res.json()
      const rawText = data.content?.[0]?.text
      return parseAiJsonResponse(rawText)
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    }
  }

  // Provedores OpenAI-Compatíveis (OPENAI, DEEPSEEK, GROQ, OPENROUTER, CUSTOM)
  let defaultBase = 'https://api.openai.com/v1'
  let defaultModel = 'gpt-4o-mini'

  if (provider === 'DEEPSEEK') {
    defaultBase = 'https://api.deepseek.com'
    defaultModel = 'deepseek-chat'
  } else if (provider === 'GROQ') {
    defaultBase = 'https://api.groq.com/openai/v1'
    defaultModel = 'llama-3.3-70b-versatile'
  } else if (provider === 'OPENROUTER') {
    defaultBase = 'https://openrouter.ai/api/v1'
    defaultModel = 'openai/gpt-4o-mini'
  } else if (provider === 'CUSTOM') {
    defaultBase = keyObj.baseUrl || 'http://localhost:11434/v1'
    defaultModel = keyObj.model || 'default'
  }

  const resolvedBase = (keyObj.baseUrl || defaultBase).replace(/\/+$/, '')
  const resolvedModel = keyObj.model || defaultModel
  const url = `${resolvedBase}/chat/completions`

  const headers = {
    'Authorization': `Bearer ${rawKey}`,
    'Content-Type': 'application/json'
  }

  if (provider === 'OPENROUTER') {
    headers['HTTP-Referer'] = 'https://conectaenem.com'
    headers['X-Title'] = 'Conecta Enem'
  }

  // Tenta com response_format: json_object primeiro, com fallback automático
  let controller = new AbortController()
  let timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    let res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const rawErrMsg = errData.error?.message || `Erro HTTP ${res.status}`

      // Se falhar por causa de response_format não suportado, tenta novamente sem esse campo
      if (rawErrMsg.includes('response_format') || res.status === 400) {
        controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
        res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: resolvedModel,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userContent }
            ],
            temperature: 0.2
          }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
      }

      if (!res.ok) {
        const retryErr = await res.json().catch(() => ({}))
        const finalMsg = retryErr.error?.message || rawErrMsg
        throw new Error(finalMsg)
      }
    }

    const data = await res.json()
    const rawText = data.choices?.[0]?.message?.content
    return parseAiJsonResponse(rawText)
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * Corrige uma redação utilizando qualquer API de Inteligência Artificial configurada
 * @param {Object} params
 * @param {string} params.theme - Tema da redação
 * @param {string} params.text - Conteúdo escrito da redação
 * @param {string} [params.title] - Título da redação (opcional)
 * @param {string} [params.apiKey] - Chave opcional informada diretamente
 * @returns {Promise<Object>} Resultado estruturado da correção
 */
export async function correctEssayWithUniversalAI({ theme, text, title, apiKey }) {
  // 1. Obtém as chaves disponíveis (com suporte a múltiplos provedores, banco de dados e fallbacks)
  let candidateKeys = []
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    candidateKeys = [{
      id: 'custom-key',
      name: 'Chave informada diretamente',
      key: apiKey.trim(),
      provider: 'GEMINI',
      fromDb: false
    }]
  } else {
    candidateKeys = await getActiveApiKeys()
  }

  if (!candidateKeys || candidateKeys.length === 0) {
    throw new Error('Nenhuma chave de Inteligência Artificial ativa foi cadastrada. Acesse o Painel Admin (/admin/chaves-api) e cadastre sua chave de API (Gemini, OpenAI, DeepSeek, Groq, OpenRouter ou Claude) para habilitar a correção de redações.')
  }

  // 2. Proteção contra textos curtos: Regra estrita do ENEM (menos de 70 palavras recebe nota zero imediata)
  const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length
  if (wordCount < 70) {
    return getZeroScoreCorrection(wordCount)
  }

  const userContent = `TEMA DA REDAÇÃO:
${theme}

${title ? `TÍTULO: ${title}\n` : ''}
TEXTO DA REDAÇÃO DO ESTUDANTE (${wordCount} palavras):
${text}

Realize a correção completa e retorne apenas o objeto JSON conforme instruído.`

  let lastError = null

  // Itera pelas chaves candidatas (rotação e tolerância a falhas / limites de cota)
  for (const keyObj of candidateKeys) {
    try {
      const parsedData = await callAiProvider(keyObj, userContent)
      const result = validateAndNormalizeCorrectionResponse(parsedData)

      // Registra sucesso e atualiza timestamp de rotação
      await recordKeyUsage(keyObj.id, { success: true })
      return result
    } catch (err) {
      const errMsg = err.message || 'Erro desconhecido'
      console.warn(`[AI Service] Falha na chave "${keyObj.name}" (${keyObj.provider || 'GEMINI'}): ${errMsg}`)
      lastError = err

      // Registra erro para incrementar contador e dar prioridade a outras chaves saudáveis
      await recordKeyUsage(keyObj.id, { success: false, error: errMsg })
    }
  }

  let userFriendlyMessage = lastError?.message || 'Erro na comunicação com os servidores de IA.'
  if (userFriendlyMessage.includes('service account is deleted or disabled') || userFriendlyMessage.includes('service account bound to the API key') || userFriendlyMessage.includes('SERVICE_DISABLED') || userFriendlyMessage.includes('PERMISSION_DENIED')) {
    userFriendlyMessage = 'A chave do Google Gemini atual (configurada no .env) está vinculada a um projeto ou conta de serviço desativada no Google Cloud. Para resolver isso imediatamente, cadastre uma nova chave de API no Painel Admin (/admin/chaves-api) ou atualize a GEMINI_API_KEY no arquivo .env.'
  } else if (userFriendlyMessage.includes('API key not valid') || userFriendlyMessage.includes('invalid_api_key')) {
    userFriendlyMessage = 'A chave de API de IA configurada é inválida ou expirou. Atualize-a no Painel do Administrador.'
  } else if (userFriendlyMessage.includes('RESOURCE_EXHAUSTED') || userFriendlyMessage.includes('Quota exceeded') || userFriendlyMessage.includes('insufficient_quota')) {
    userFriendlyMessage = 'O limite de cota das chaves de IA cadastradas foi atingido temporariamente. Cadastre uma chave adicional ou aguarde a liberação da cota.'
  }

  throw new Error(`Não foi possível corrigir a redação no momento: ${userFriendlyMessage}`)
}

// Aliases para total compatibilidade retroativa com código existente
export const correctEssayWithGemini = correctEssayWithUniversalAI
export const correctEssayWithAI = correctEssayWithUniversalAI

/**
 * Validação estrita do schema e sincronização precisa de notas e detalhamento pedagógico
 */
export function validateAndNormalizeCorrectionResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Validação de schema falhou: a resposta da IA não é um objeto JSON válido.')
  }

  const validScores = [0, 40, 80, 120, 160, 200]
  const clampScore = (score) => {
    if (score === undefined || score === null) return null
    const num = Number(score)
    if (Number.isNaN(num)) return null
    return validScores.reduce((prev, curr) => Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev, 0)
  }

  // Parecer Geral
  const generalFeedback = typeof data.generalFeedback === 'string' ? data.generalFeedback.trim() : ''
  if (!generalFeedback || generalFeedback.length < 20) {
    throw new Error('Validação pedagógica falhou: parecer geral da IA insuficiente ou ausente.')
  }

  // Detalhamento de competências
  if (!data.competencies || typeof data.competencies !== 'object' || Array.isArray(data.competencies)) {
    throw new Error('Validação pedagógica falhou: detalhamento de competências ausente.')
  }

  const compConfigs = {
    c1: { defaultName: 'Domínio da Norma Culta' },
    c2: { defaultName: 'Compreensão do Tema e Repertório' },
    c3: { defaultName: 'Projeto de Texto e Argumentação' },
    c4: { defaultName: 'Coesão e Recursos Linguísticos' },
    c5: { defaultName: 'Proposta de Intervenção' }
  }

  const normalizedCompetencies = {}
  const scores = {}

  // Sincroniza notas raiz e competências para evitar qualquer divergência
  for (const k of ['c1', 'c2', 'c3', 'c4', 'c5']) {
    const rawComp = data.competencies[k]
    const rootScore = clampScore(data[`${k}Score`])
    const compScore = clampScore(rawComp?.score)

    const finalScore = compScore !== null ? compScore : (rootScore !== null ? rootScore : null)

    if (finalScore === null) {
      throw new Error(`Validação pedagógica falhou: nota da competência ${k.toUpperCase()} não foi informada ou é inválida.`)
    }

    const feedback = typeof rawComp?.feedback === 'string' ? rawComp.feedback.trim() : ''
    if (!feedback || feedback.length < 10) {
      throw new Error(`Validação pedagógica falhou: parecer da competência ${k.toUpperCase()} está vazio ou insuficiente.`)
    }

    scores[k] = finalScore
    normalizedCompetencies[k] = {
      score: finalScore,
      name: typeof rawComp?.name === 'string' && rawComp.name.trim() ? rawComp.name.trim() : compConfigs[k].defaultName,
      level: `Nível ${finalScore / 40} (${finalScore} pts)`,
      feedback
    }
  }

  // C5: Elementos da proposta de intervenção
  const c5Score = scores.c5
  const rawElements = data.competencies?.c5?.interventionElements
  normalizedCompetencies.c5.interventionElements = {
    agente: typeof rawElements?.agente === 'boolean' ? rawElements.agente : c5Score >= 80,
    acao: typeof rawElements?.acao === 'boolean' ? rawElements.acao : c5Score >= 80,
    meioModo: typeof rawElements?.meioModo === 'boolean' ? rawElements.meioModo : c5Score >= 120,
    efeito: typeof rawElements?.efeito === 'boolean' ? rawElements.efeito : c5Score >= 160,
    detalhamento: typeof rawElements?.detalhamento === 'boolean' ? rawElements.detalhamento : c5Score === 200
  }

  // Desvios gramaticais
  const grammarErrors = Array.isArray(data.grammarErrors)
    ? data.grammarErrors
        .filter(g => g && typeof g === 'object')
        .map(g => ({
          original: typeof g.original === 'string' ? g.original.trim() : '',
          suggestion: typeof g.suggestion === 'string' ? g.suggestion.trim() : '',
          explanation: typeof g.explanation === 'string' ? g.explanation.trim() : '',
          type: typeof g.type === 'string' && g.type.trim() ? g.type.trim() : 'Desvio Gramatical',
          line: Number.isInteger(Number(g.line)) && Number(g.line) > 0 ? Number(g.line) : null
        }))
        .filter(g => g.original || g.suggestion)
    : []

  // Pontos fortes
  const positivePoints = Array.isArray(data.positivePoints)
    ? data.positivePoints.filter(p => typeof p === 'string' && p.trim().length > 0).map(p => p.trim())
    : []

  if (positivePoints.length === 0) {
    positivePoints.push('Desenvolvimento textual estruturado em concordância com a proposta solicitada.')
  }

  // Oportunidades de melhoria
  const improvements = Array.isArray(data.improvements)
    ? data.improvements.filter(i => typeof i === 'string' && i.trim().length > 0).map(i => i.trim())
    : (Array.isArray(data.improvementTips)
        ? data.improvementTips.filter(i => typeof i === 'string' && i.trim().length > 0).map(i => i.trim())
        : [])

  if (improvements.length === 0) {
    improvements.push('Aprofundar repertório sociocultural produtivo e consolidar conectivos interparágrafos.')
  }

  // Nota total é calculada estritamente como a soma das 5 notas sincronizadas
  const totalScore = scores.c1 + scores.c2 + scores.c3 + scores.c4 + scores.c5

  return {
    totalScore,
    c1Score: scores.c1,
    c2Score: scores.c2,
    c3Score: scores.c3,
    c4Score: scores.c4,
    c5Score: scores.c5,
    competencies: normalizedCompetencies,
    grammarErrors,
    positivePoints,
    improvements,
    generalFeedback
  }
}
