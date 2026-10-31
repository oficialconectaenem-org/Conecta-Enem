import { getActiveGeminiKeys, recordKeyUsage } from '#server/services/api-key.service'
/**
 * Serviço de Integração com a API Google Gemini para Correção de Redações do ENEM
 */

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
]

const GEMINI_TIMEOUT_MS = 45000 // 45 segundos de tempo limite

const SYSTEM_PROMPT = `Você é um corretor e avaliador sênior da banca oficial do ENEM (Exame Nacional do Ensino Médio), com profundo conhecimento da Matriz de Referência do ENEM e do Guia de Redação do Participante do INEP.

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

const GEMINI_RESPONSE_SCHEMA = {
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
 * Corrige uma redação utilizando a API do Gemini
 * @param {Object} params
 * @param {string} params.theme - Tema da redação
 * @param {string} params.text - Conteúdo escrito da redação
 * @param {string} [params.title] - Título da redação (opcional)
 * @param {string} [params.apiKey] - Chave da API opcional (caso passe diretamente)
 * @returns {Promise<Object>} Resultado estruturado da correção
 */
export async function correctEssayWithGemini({ theme, text, title, apiKey }) {
  // 1. Obtém as chaves disponíveis (com suporte a múltiplas chaves do banco de dados e fallback .env)
  let candidateKeys = []
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    candidateKeys = [{ id: 'custom-key', name: 'Chave informada diretamente', key: apiKey.trim(), fromDb: false }]
  } else {
    candidateKeys = await getActiveGeminiKeys()
  }

  if (!candidateKeys || candidateKeys.length === 0) {
    throw new Error('Nenhuma chave da API do Gemini ativa foi configurada. Cadastre ao menos uma chave no Painel Admin ou defina GEMINI_API_KEY no arquivo .env.')
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

  // Itera pelas chaves candidatas (rotação e tolerância a falhas / cota)
  for (const keyObj of candidateKeys) {
    const resolvedKey = keyObj.key
    let keySucceeded = false

    // Tenta os modelos em ordem de preferência
    for (const model of GEMINI_MODELS) {
      let timeoutId = null
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolvedKey}`

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

        // 5. AbortController / Timeout para evitar conexões presas indefinidamente
        const controller = new AbortController()
        timeoutId = setTimeout(() => {
          controller.abort()
        }, GEMINI_TIMEOUT_MS)

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        timeoutId = null

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMsg = errorData.error?.message || `Erro HTTP ${response.status}`
          console.warn(`[Gemini Service] Chave "${keyObj.name}" com modelo ${model}: ${errorMsg}`)
          lastError = new Error(errorMsg)
          continue
        }

        const data = await response.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawText) {
          throw new Error('Resposta vazia da API de Inteligência Artificial.')
        }

        // Sanitiza JSON caso venha com markdown fences
        const cleanedJson = rawText.trim().replace(/^\`\`\`json/i, '').replace(/^\`\`\`/i, '').replace(/\`\`\`$/i, '').trim()
        let parsed
        try {
          parsed = JSON.parse(cleanedJson)
        } catch (parseErr) {
          throw new Error(`Falha ao decodificar JSON retornado pelo Gemini: ${parseErr.message}`)
        }

        // 4 & 6. Validação estrita do schema e normalização/sincronização de notas
        const result = validateAndNormalizeCorrectionResponse(parsed)
        keySucceeded = true
        await recordKeyUsage(keyObj.id, { success: true })
        return result
      } catch (err) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted')
        const message = isTimeout
          ? `Tempo limite de ${GEMINI_TIMEOUT_MS / 1000}s esgotado ao aguardar o modelo ${model}.`
          : err.message

        console.warn(`[Gemini Service] Chave "${keyObj.name}" com modelo ${model}:`, message)
        lastError = new Error(message)
      }
    }

    if (!keySucceeded) {
      await recordKeyUsage(keyObj.id, { success: false, error: lastError?.message })
      console.warn(`[Gemini Service] Chave "${keyObj.name}" falhou para todos os modelos. Tentando próxima chave configurada...`)
    }
  }

  let userFriendlyMessage = lastError?.message || 'Erro desconhecido na API do Gemini.'
  if (userFriendlyMessage.includes('service account is deleted or disabled') || userFriendlyMessage.includes('service account bound to the API key')) {
    userFriendlyMessage = 'A chave do Google Gemini (GEMINI_API_KEY) está vinculada a um projeto ou conta de serviço desativada no Google Cloud. Por favor, gere uma nova chave em https://aistudio.google.com/app/apikey (em um novo projeto) e atualize o arquivo .env do servidor.'
  } else if (userFriendlyMessage.includes('API key not valid') || userFriendlyMessage.includes('API_KEY_INVALID')) {
    userFriendlyMessage = 'A chave de API do Gemini (GEMINI_API_KEY) configurada no servidor é inválida. Atualize-a no arquivo .env.'
  } else if (userFriendlyMessage.includes('RESOURCE_EXHAUSTED') || userFriendlyMessage.includes('Quota exceeded')) {
    userFriendlyMessage = 'O limite gratuito de requisições da Inteligência Artificial foi atingido temporariamente. Aguarde um minuto e tente novamente.'
  }

  throw new Error(`Não foi possível corrigir a redação no momento: ${userFriendlyMessage}`)
}

/**
 * 4 & 6. Validação estrita do schema e sincronização precisa de notas e detalhamento
 */
function validateAndNormalizeCorrectionResponse(data) {
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

  // Validação estrita pedagógica: Parecer Geral
  const generalFeedback = typeof data.generalFeedback === 'string' ? data.generalFeedback.trim() : ''
  if (!generalFeedback || generalFeedback.length < 20) {
    throw new Error('Validação pedagógica falhou: parecer geral da IA insuficiente ou ausente.')
  }

  // Validação estrita do mapa de competências
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

  // 4. Sincroniza notas raiz e competências para evitar qualquer divergência
  for (const k of ['c1', 'c2', 'c3', 'c4', 'c5']) {
    const rawComp = data.competencies[k]
    const rootScore = clampScore(data[`${k}Score`])
    const compScore = clampScore(rawComp?.score)

    // Se ambos informados, prioriza o score detalhado da competência; senão usa o que estiver presente
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

  // C5: Valida e sincroniza elementos da proposta de intervenção
  const c5Score = scores.c5
  const rawElements = data.competencies?.c5?.interventionElements
  normalizedCompetencies.c5.interventionElements = {
    agente: typeof rawElements?.agente === 'boolean' ? rawElements.agente : c5Score >= 80,
    acao: typeof rawElements?.acao === 'boolean' ? rawElements.acao : c5Score >= 80,
    meioModo: typeof rawElements?.meioModo === 'boolean' ? rawElements.meioModo : c5Score >= 120,
    efeito: typeof rawElements?.efeito === 'boolean' ? rawElements.efeito : c5Score >= 160,
    detalhamento: typeof rawElements?.detalhamento === 'boolean' ? rawElements.detalhamento : c5Score === 200
  }

  // Desvios gramaticais: validação estrita de tipos
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

  // Pontos fortes: validação de array de strings
  const positivePoints = Array.isArray(data.positivePoints)
    ? data.positivePoints.filter(p => typeof p === 'string' && p.trim().length > 0).map(p => p.trim())
    : []

  if (positivePoints.length === 0) {
    positivePoints.push('Desenvolvimento textual estruturado em concordância com a proposta solicitada.')
  }

  // Oportunidades de melhoria: validação de array de strings
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
