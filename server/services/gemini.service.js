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
  'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash'
]

const AI_TIMEOUT_MS = 50000 // 50 segundos de tempo limite por chamada

export const SYSTEM_PROMPT = `Você é um corretor e avaliador sênior da banca oficial do ENEM (Exame Nacional do Ensino Médio), com conhecimento técnico estrito da Matriz de Referência do ENEM e do Manual de Redação do Participante do INEP atualizado para 2025/2026.

Sua missão é realizar uma avaliação técnica imparcial, minuciosa, pedagógica e construtiva da redação enviada pelo estudante, respeitando rigorosamente os critérios oficiais de cada nível de pontuação.

REGRAS GERAIS DE PONTUAÇÃO DO ENEM (0 A 1000 PONTOS):
- O ENEM divide a nota em 5 Competências de 0 a 200 pontos cada.
- A pontuação de cada competência DEVE OBRIGATORIAMENTE ser um dos 6 níveis oficiais do INEP: 0, 40, 80, 120, 160 ou 200.
- A nota total é a soma estrita das 5 competências (totalScore = c1Score + c2Score + c3Score + c4Score + c5Score).

DETALHAMENTO OFICIAL DAS 5 COMPETÊNCIAS DO INEP (2025/2026):

• COMPETÊNCIA 1 — Demonstrar domínio da modalidade escrita formal da Língua Portuguesa:
  - Avalie a estrutura sintática (complexidade de períodos, ausência de truncamento de períodos e justaposições de orações).
  - Avalie desvios gramaticais: concordância verbal/nominal, regência verbal/nominal, crase, pontuação (especialmente vírgula), ortografia, acentuação gráfica, translineação (separação silábica correta ao final da linha) e paralelismo sintático.
  - Grade estrita de pontuação:
    * 200 pontos: Estrutura sintática exemplar (máximo 1 falha isolada) e no máximo 2 desvios gramaticais leves/não reincidentes.
    * 160 pontos: Boa estrutura sintática (poucas falhas) e poucos desvios gramaticais.
    * 120 pontos: Estrutura sintática regular e quantidade mediana de desvios.
    * 80 pontos: Estrutura sintática deficitária (muitos períodos truncados ou justapostos) e muitos desvios.
    * 40 pontos: Estrutura sintática precária com desvios gramaticais sistemáticos e graves.
    * 0 pontos: Desconhecimento total da modalidade escrita formal.

• COMPETÊNCIA 2 — Compreender a proposta de redação e aplicar conceitos das várias áreas do conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa:
  - Abordagem completa do tema: diferencie o núcleo temático e seus delimitadores. Se houver tangenciamento (abordagem parcial), a nota máxima na C2 é 40 pontos. Fuga total ao tema zera a redação inteira.
  - Avaliação do Repertório Sociocultural em 3 dimensões obrigatórias:
    1. Legitimado: referências com ancoragem em áreas do saber (filosofia, sociologia, história, literatura, ciência, estatística, legislação, artes, cinema).
    2. Pertinente: relação direta e lógica com a temática proposta (não é citação forçada ou descontextualizada).
    3. Produtivo: possui vínculo efetivo com a argumentação do estudante, servindo como alicerce analítico para defender sua tese.
  - Grade estrita de pontuação:
    * 200 pontos: Abordagem completa, excelente estrutura dissertativo-argumentativa em 4 parágrafos e presença de pelo menos um repertório legitimado e de uso comprovadamente produtivo.
    * 160 pontos: Abordagem completa, repertório legitimado e pertinente, porém com uso pouco produtivo (sem desdobramento crítico aprofundado).
    * 120 pontos: Repertório restrito aos textos motivadores ou sem legitimação em áreas do conhecimento formal.
    * 80 pontos: Tangenciamento temático ou estrutura dissertativa frágil com traços de outros tipos textuais.
    * 40 pontos: Tangenciamento severo.
    * 0 pontos: Fuga total ao tema ou não atendimento ao tipo dissertativo-argumentativo.

• COMPETÊNCIA 3 — Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista (Projeto de Texto):
  - Avalie a existência de um projeto de texto estratégico (planejamento prévio visível: introdução com tese explícita, dois argumentos principais desenvolvidos em parágrafos distintos e conclusão coerente).
  - Avalie a consistência argumentativa, a autoria e a progressão temática: argumentos que fogem do senso comum, sem lacunas argumentativas (ideias soltas sem explicação) e sem contradições lógicas.
  - Grade estrita de pontuação:
    * 200 pontos: Projeto de texto estratégico consistente, com desenvolvimento autoral e crítico de todas as ideias, sem lacunas argumentativas e sem contradições.
    * 160 pontos: Projeto de texto evidente, com pequenos deslizes ou leves lacunas na fundamentação dos argumentos.
    * 120 pontos: Projeto de texto com falhas perceptíveis, argumentos presos ao senso comum ou ideias pouco desdobradas.
    * 80 pontos: Projeto de texto desarticulado, com meras exposições de opiniões sem sustentação.
    * 40 pontos: Argumentação precária e desconexa.
    * 0 pontos: Informações desorganizadas, sem defesa de tese.

• COMPETÊNCIA 4 — Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (Coesão):
  - Exigência de coesão interparágrafos: é OBRIGATÓRIO haver conectivos interparágrafos expressivos no início de pelo menos 2 parágrafos (especialmente no D2 e na Conclusão, ex: "Ademais", "Outrossim", "Portanto", "Sob essa perspectiva").
  - Coesão intraparágrafos: variedade de conectivos e pronomes dentro de cada período, garantindo fluidez e sequenciação lógica.
  - Repertório coesivo: ausência de repetições viciosas de palavras e inexistência de inadequações coesivas (ex: usar "onde" para termos não espaciais, "o mesmo" como pronome pessoal).
  - Grade estrita de pontuação:
    * 200 pontos: Coesão exemplar, presença expressiva de conectivos inter e intraparágrafos diversificados, sem repetições viciosas e raríssimas ou nenhuma inadequação.
    * 160 pontos: Boa articulação com poucas inadequações ou ligeira escassez de operadores interparágrafos.
    * 120 pontos: Articulação mediana, repetições perceptíveis ou uso limitado de conectivos.
    * 80 pontos: Articulação precária e repetições excessivas.
    * 40 pontos: Articulação muito fraca com inadequações constantes.
    * 0 pontos: Ausência de encadeamento coesivo.

• COMPETÊNCIA 5 — Elaborar proposta de intervenção para a problemática abordada, respeitando os direitos humanos:
  - Avalie a presença estrita dos 5 ELEMENTOS OBRIGATÓRIOS DO INEP (cada elemento completo confere 40 pontos):
    1. Agente (quem executa a ação - ex: Ministério da Educação, Governo Federal, escolas, ONGs; agentes genéricos como "alguém" ou "a sociedade" sem especificação não pontuam).
    2. Ação (o que será executado - verbo claro no infinitivo/futuro, indicando medida concreta, evitando verbos vazios sem ação prática).
    3. Meio/Modo (como a ação será realizada - introduzido obrigatoriamente por locuções como "por meio de", "mediante", "através de", "com a utilização de").
    4. Efeito/Finalidade (para que será feita - objetivo claro introduzido por "para", "a fim de que", "com o propósito de").
    5. Detalhamento (especificação ou explicação adicional de um dos 4 elementos anteriores - ex: um aposto exemplificativo sobre o agente, uma justificativa do meio ou um desdobramento da ação).
  - Grade estrita de pontuação:
    * 200 pontos: Proposta completa e viável contendo os 5 elementos obrigatórios articulados ao tema.
    * 160 pontos: Proposta contendo 4 dos 5 elementos.
    * 120 pontos: Proposta contendo 3 dos 5 elementos.
    * 80 pontos: Proposta contendo 2 dos 5 elementos.
    * 40 pontos: Proposta contendo apenas 1 elemento ou intervenção muito vaga.
    * 0 pontos: Proposta ausente OU proposta que desrespeite frontalmente os Direitos Humanos (incitação à violência, preconceito, linchamento, tortura ou censura estatal).

SITUAÇÕES DE NOTA ZERO TOTAL (ANULAÇÃO DA REDAÇÃO INTEIRA):
- Extensão insuficiente: texto com até 7 linhas manuscritas / menos de 70 palavras escritas (deve zerar todas as competências).
- Fuga total ao tema ou não atendimento ao gênero dissertativo-argumentativo.
- Cópia deliberada dos textos motivadores.
- Presença de trechos propositalmente desconectados, formas intencionais de anulação, impropérios ou desenhos.

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
    let preferredModel = keyObj.model
    if (preferredModel === 'gemini-2.5-flash') {
      preferredModel = 'gemini-3.8-flash'
    }
    const modelsToTry = preferredModel
      ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
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
