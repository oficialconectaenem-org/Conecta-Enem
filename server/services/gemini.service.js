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
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-001'
]

const AI_TIMEOUT_MS = 25000 // 25 segundos de tempo limite por chamada

export const SYSTEM_PROMPT = `Você é um corretor e avaliador sênior da banca oficial do ENEM (Exame Nacional do Ensino Médio), com domínio técnico estrito da Matriz de Referência do ENEM e dos Guias de Correção Oficiais do INEP para 2025/2026.

Sua missão é realizar uma avaliação técnica cirúrgica, imparcial, minuciosa e com alto valor pedagógico da redação enviada pelo estudante, respeitando rigorosamente a grade de pontuação do INEP.

REGRAS GERAIS DE PONTUAÇÃO DO ENEM (0 A 1000 PONTOS):
- O ENEM divide a nota em 5 Competências de 0 a 200 pontos cada.
- A pontuação de cada competência DEVE OBRIGATORIAMENTE ser um dos 6 níveis oficiais do INEP: 0, 40, 80, 120, 160 ou 200.
- A nota total é a soma estrita das 5 competências (totalScore = c1Score + c2Score + c3Score + c4Score + c5Score).

MATRIZ OFICIAL DE CORREÇÃO DO INEP (2025/2026):

• COMPETÊNCIA 1 — Demonstrar domínio da modalidade escrita formal da Língua Portuguesa:
  - Avalie SEPARADAMENTE:
    a) Estrutura Sintática: complexidade de períodos, identificando Truncamento de períodos (período quebrado) ou Justaposição de orações (orações independentes coladas por vírgula sem conectivo).
    b) Desvios Gramaticais: concordância verbal/nominal, regência, crase, pontuação (vírgula), ortografia, acentuação, translineação e paralelismo.
  - Regra Estrita da C1:
    * 200 pontos: No máximo 1 falha de estrutura sintática E no máximo 2 desvios gramaticais leves/não reincidentes. (Atenção: 3 desvios já impedem os 200 pontos, caindo para 160!).
    * 160 pontos: Boa estrutura sintática (poucas falhas) e poucos desvios gramaticais (3 a 5).
    * 120 pontos: Estrutura sintática regular e quantidade média de desvios (6 a 9).
    * 80 pontos: Estrutura sintática deficitária com muitos desvios (10+).
    * 40 pontos: Estrutura sintática precária com desvios graves e sistemáticos.
    * 0 pontos: Desconhecimento total da norma padrão.

• COMPETÊNCIA 2 — Compreender a proposta de redação e aplicar conceitos das várias áreas do conhecimento (Tema & Repertório):
  - Avaliação do Tema:
    * Completa: aborda o assunto geral e o recorte específico.
    * Tangenciamento: aborda apenas o assunto geral ou apenas parte do recorte (limita a nota da C2 em no MÁXIMO 40 pontos!).
    * Fuga Total: anula a redação inteira (nota zero).
  - Tríade Obrigatória do Repertório Sociocultural:
    1. Legitimado: referências ancoradas em áreas do saber (Filosofia, Sociologia, História, Literatura, Leis/Constituição, Dados Estatísticos, Cinema).
    2. Pertinente: relação direta e lógica com a temática proposta.
    3. Produtivo: possui vínculo efetivo com a argumentação do estudante, servindo como alicerce analítico e não como citação decorada solta.
  - Regra Estrita da C2:
    * 200 pontos: Abordagem completa + estrutura em 4 parágrafos + pelo menos 1 repertório legitimado, pertinente E de uso comprovadamente produtivo.
    * 160 pontos: Abordagem completa + repertório legitimado e pertinente, porém pouco produtivo (sem desdobramento crítico aprofundado).
    * 120 pontos: Repertório restrito aos textos motivadores OU repertório sem legitimação em área do conhecimento formal.
    * 80 pontos: Tangenciamento temático ou traços de outros gêneros.
    * 40 pontos: Tangenciamento severo.
    * 0 pontos: Fuga total ao tema ou tipo não dissertativo.

• COMPETÊNCIA 3 — Selecionar, relacionar, organizar e interpretar informações em defesa de um ponto de vista (Projeto de Texto & Argumentação):
  - Projeto de Texto Estratégico: introdução com tese clara com 2 núcleos argumentativos (A1 e A2), dois parágrafos de desenvolvimento (D1 desenvolvendo A1 e D2 desenvolvendo A2) e conclusão harmônica.
  - Detecção de Lacunas Argumentativas: quando o estudante faz uma afirmação enfática, mas não explica o porquê, a causa ou a consequência, deixando a ideia sem sustentação.
  - Regra Estrita da C3:
    * 200 pontos: Projeto de texto estratégico consistente, sem lacunas argumentativas e sem contradições lógicas.
    * 160 pontos: Projeto de texto evidente, com leves lacunas na fundamentação de um dos argumentos.
    * 120 pontos: Projeto de texto regular, previsível, com argumentos presos ao senso comum ou lacunas perceptíveis.
    * 80 pontos: Projeto de texto desarticulado ou expositivo sem defesa de tese.
    * 40 pontos: Argumentação precária e desconexa.
    * 0 pontos: Informações desorganizadas sem ponto de vista.

• COMPETÊNCIA 4 — Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (Coesão):
  - Exigência Mecânica:
    a) Conectivos interparágrafos: é OBRIGATÓRIO haver operadores interparágrafos expressivos no início de pelo menos 2 parágrafos (especialmente no D2 e na Conclusão, ex: "Ademais", "Outrossim", "Portanto", "Sob essa perspectiva").
    b) Conectivos intraparágrafos: presença expressiva de conjunções e pronomes dentro dos períodos em todos os parágrafos.
    c) Ausência de repetições viciosas de palavras (usar sinônimos) e inexistência de inadequações (ex: "onde" para tempo, "o mesmo" como pronome).
  - Regra Estrita da C4:
    * 200 pontos: Presença expressiva de conectivos inter e intraparágrafos diversificados, sem repetições viciosas e sem inadequações.
    * 160 pontos: Boa articulação, mas com leve escassez de operadores interparágrafos ou poucas repetições.
    * 120 pontos: Articulação mediana com repetições perceptíveis de termos.
    * 80 pontos: Articulação precária e repetições excessivas.
    * 40 pontos: Articulação muito fraca com inadequações constantes.
    * 0 pontos: Ausência de encadeamento coesivo.

• COMPETÊNCIA 5 — Elaborar proposta de intervenção para a problemática abordada, respeitando os direitos humanos:
  - Avaliação Somatória dos 5 Elementos Obrigatórios (40 pontos cada):
    1. Agente (quem executa a ação - ex: Ministério da Educação, secretarias, ONGs; termos genéricos como "a sociedade" ou "o governo" sem especificação não pontuam).
    2. Ação (o que será executado - verbo claro no infinitivo/futuro de medida prática).
    3. Meio/Modo (como a ação será executada - introduzido por "por meio de", "mediante", "através de").
    4. Efeito/Finalidade (para que será feita - introduzido por "a fim de que", "com o fito de", "para que").
    5. Detalhamento (especificação adicional de um dos 4 elementos anteriores - aposto, explicação ou desdobramento prático).
  - Regra Estrita da C5:
    * 200 pontos: Proposta completa contendo os 5 elementos bem articulados.
    * 160 pontos: Contém 4 elementos.
    * 120 pontos: Contém 3 elementos.
    * 80 pontos: Contém 2 elementos.
    * 40 pontos: Contém apenas 1 elemento ou intervenção genérica.
    * 0 pontos: Ausente OU proposta que desrespeite frontalmente os Direitos Humanos.

• PEDAGOGIA ATIVA — REESCRITA NOTA 1000 DO PARÁGRAFO MAIS FRACO:
  - Identifique o parágrafo onde o estudante mais perdeu pontos (geralmente D1 ou D2).
  - Forneça uma reescrita completa no padrão Nota 1000 mantendo o ponto de vista original do estudante, demonstrando como articular repertório produtivo e eliminar lacunas argumentativas.

• MARCAÇÕES TEXTUAIS INLINE (HIGHLIGHTS):
  - Identifique trechos específicos do texto para grifar por competência: C1_ERROR, C2_REPERTOIRE, C3_THESIS, C4_CONNECTOR, C5_ELEMENT.

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
      "feedback": "string",
      "desviosCount": number,
      "falhasSintaticasCount": number,
      "falhasSintaticas": [
        { "trecho": "string", "tipo": "Truncamento ou Justaposição", "explicacao": "string" }
      ]
    },
    "c2": {
      "score": number,
      "name": "Compreensão da Proposta e Repertório",
      "level": "string",
      "feedback": "string",
      "temaStatus": "COMPLETA",
      "temaAnalise": "string",
      "repertorios": [
        {
          "texto": "string",
          "fonteArea": "Filosofia / História / Lei / etc",
          "legitimado": boolean,
          "pertinente": boolean,
          "produtivo": boolean,
          "analise": "string"
        }
      ]
    },
    "c3": {
      "score": number,
      "name": "Projeto de Texto e Argumentação",
      "level": "string",
      "feedback": "string",
      "teseIdentificada": "string",
      "lacunasArgumentativas": [
        { "paragrafo": number, "trecho": "string", "explicacao": "string", "comoResolver": "string" }
      ]
    },
    "c4": {
      "score": number,
      "name": "Coesão e Recursos Linguísticos",
      "level": "string",
      "feedback": "string",
      "conectivosInter": {
        "d1": "string ou ausente",
        "d2": "string ou ausente",
        "conclusao": "string ou ausente",
        "atendeMinimoDois": boolean
      },
      "repeticoesViciosas": [
        { "palavra": "string", "ocorrencias": number, "sinonimos": ["string"] }
      ]
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
      },
      "elementosDetalhados": {
        "agente": { "presente": boolean, "trecho": "string", "comentario": "string" },
        "acao": { "presente": boolean, "trecho": "string", "comentario": "string" },
        "meioModo": { "presente": boolean, "trecho": "string", "comentario": "string" },
        "efeito": { "presente": boolean, "trecho": "string", "comentario": "string" },
        "detalhamento": { "presente": boolean, "trecho": "string", "comentario": "string" }
      },
      "respeitaDireitosHumanos": boolean,
      "propostaCompletaSugerida": "string"
    }
  },
  "weakestParagraph": {
    "numero": number,
    "titulo": "string",
    "textoOriginal": "string",
    "motivoPerdaNota": "string",
    "reescritaNota1000": "string",
    "explicacaoPedagogica": "string"
  },
  "textHighlights": [
    {
      "text": "string",
      "type": "C1_ERROR",
      "label": "string",
      "comment": "string"
    }
  ],
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

export const THEME_GENERATION_SYSTEM_PROMPT = `Você é um formulador sênior da banca oficial do ENEM e do INEP, especialista em criar propostas oficiais de redação dissertativo-argumentativa no mais alto padrão de exigência do Exame Nacional do Ensino Médio.

Sua missão é conceber uma proposta de redação INÉDITA, instigante, contemporânea e de grande relevância para a sociedade brasileira, com textos motivadores densos, analíticos e de alto nível reflexivo.

DIRETRIZES DA BANCA DO ENEM:
1. TÍTULO DO TEMA (title):
   - Deve seguir a formulação canônica do ENEM, delimitando um problema social, cultural, ambiental, educacional, científico ou tecnológico vivido no Brasil.
   - Utilize estruturas canônicas: "Desafios para...", "Caminhos para combater...", "A persistência de...", "O papel de... na garantia de...", "Impactos de... na sociedade brasileira", "A importância da... no Brasil contemporâneo", "Invisibilidade e...", etc.
   - Deve ser claro, específico (com recorte temático preciso) e centrado na realidade brasileira.

2. EIXO TEMÁTICO (axis):
   - Categorize em um dos eixos oficiais: "Sociedade e Cidadania", "Ciência e Tecnologia", "Saúde Pública e Mental", "Meio Ambiente e Sustentabilidade", "Educação e Cultura", "Direitos Humanos", "Economia e Trabalho".

3. INSTRUÇÕES OFICIAIS (description):
   - Redija a instrução oficial do edital do ENEM: "A partir da leitura dos textos motivadores seguintes e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema \"[TÍTULO]\", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista."

4. TEXTOS MOTIVADORES (motivators - forneça exatamente 3 ou 4 textos motivadores diversificados):
   - Texto I: Contextualização jornalística ou sociológica contendo dados estatísticos ou demográficos realistas (com indicação de fonte fidedigna: ex: IBGE, Ipea, Fiocruz, Ministérios, OMS).
   - Texto II: Perspectiva legal, constitucional ou de direitos fundamentais (com citação de dispositivo da CF/88, declaração universal ou legislação brasileira).
   - Texto III: Análise crítica conceitual sobre as causas estruturais ou os impactos reais e cotidianos do problema sobre as pessoas.
   - Texto IV (opcional): Síntese reflexiva ou infográfico textual.
   - Cada motivador DEVE conter: "title" (ex: "Texto I"), "content" (parágrafos densos e bem escritos) e "source" (ex: "Fonte: IBGE / Censo Demográfico").

5. DICAS PEDAGÓGICAS (hints):
   - repertorySuggestions: Array com 3 sugestões de repertório sociocultural legitimado diretamente aplicáveis (filósofos, sociólogos, obras literárias, filmes, leis ou marcos históricos brasileiros).
   - problemCores: Array com 2 núcleos problemáticos centrais (Argumento 1 e Argumento 2) para direcionar o projeto de texto e a tese do estudante.

Retorne EXCLUSIVAMENTE o objeto JSON válido conforme o schema.`

export const THEME_GENERATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    axis: { type: 'STRING' },
    description: { type: 'STRING' },
    motivators: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          content: { type: 'STRING' },
          source: { type: 'STRING' }
        },
        required: ['title', 'content', 'source']
      }
    },
    hints: {
      type: 'OBJECT',
      properties: {
        repertorySuggestions: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        },
        problemCores: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        }
      },
      required: ['repertorySuggestions', 'problemCores']
    }
  },
  required: ['title', 'axis', 'description', 'motivators', 'hints']
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
async function callAiProvider(keyObj, userContent, options = {}) {
  const systemPrompt = options.systemPrompt || SYSTEM_PROMPT
  const responseSchema = options.responseSchema || null
  const temperature = options.temperature !== undefined ? options.temperature : 0.2
  const maxTokens = options.maxTokens || 8192
  const provider = (keyObj.provider || 'GEMINI').toUpperCase()
  const rawKey = (keyObj.key || '').trim()

  if (provider === 'GEMINI') {
    let preferredModel = (keyObj.model || '').trim()
    const modelsToTry = [
      preferredModel,
      ...GEMINI_MODELS
    ].filter((m, i, a) => m && a.indexOf(m) === i)

    let lastGeminiErr = null
    let primaryOverloadErr = null

    for (const model of modelsToTry) {
      // Tenta até 2 vezes para sobrecarga temporária
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          console.info(`[AI Gemini] Aguardando 1.5s antes de retentar modelo ${model}...`)
          await new Promise(resolve => setTimeout(resolve, 1500))
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawKey}`
          
          let useSchema = responseSchema
          let res = null
          let rawMsg = ''

          for (let schemaTry = 0; schemaTry < 2; schemaTry++) {
            const payload = {
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: userContent }]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                ...(useSchema ? { responseSchema: useSchema } : {}),
                temperature,
                maxOutputTokens: 8192
              }
            }

            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            })

            if (res.ok) break

            const errData = await res.json().catch(() => ({}))
            rawMsg = errData.error?.message || `Erro HTTP ${res.status}`

            // Se falhar com erro de schema ou 400 Bad Request e estava usando responseSchema,
            // retenta na 2ª tentativa sem responseSchema (apenas responseMimeType: 'application/json')
            if (useSchema && (res.status === 400 || rawMsg.includes('schema') || rawMsg.includes('Schema') || rawMsg.includes('INVALID_ARGUMENT'))) {
              console.warn(`[AI Gemini] Erro de schema no modelo ${model} (${rawMsg}). Retentando sem responseSchema...`)
              useSchema = null
              continue
            }
            break
          }

          clearTimeout(timeoutId)

          if (!res.ok) {
            // Se for modelo não encontrado ou não suportado (404), avança IMEDIATAMENTE para o próximo modelo sem esperar!
            if (res.status === 404 || rawMsg.includes('not found') || rawMsg.includes('is not supported')) {
              console.warn(`[AI Gemini] Modelo ${model} indisponível (${rawMsg}). Avançando imediatamente para próximo modelo...`)
              lastGeminiErr = new Error(rawMsg)
              break
            }

            const isHighDemand = res.status === 503 || res.status === 429 ||
              rawMsg.includes('high demand') || rawMsg.includes('Resource has been exhausted') || rawMsg.includes('spikes in demand') || rawMsg.includes('quota')

            if (isHighDemand) {
              primaryOverloadErr = new Error('Os servidores da IA do Google estão enfrentando alta demanda temporária neste momento. Por favor, clique em "Tentar Novamente Agora" em alguns instantes.')
              console.warn(`[AI Gemini] Modelo ${model} sob alta demanda temporária: ${rawMsg}`)
              if (attempt < 1) continue
              break
            }

            lastGeminiErr = new Error(rawMsg)
            break
          }

          const data = await res.json()
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
          return parseAiJsonResponse(rawText)
        } catch (err) {
          clearTimeout(timeoutId)
          if (attempt < 1) continue
          lastGeminiErr = err
        }
      }
    }
    throw primaryOverloadErr || lastGeminiErr || new Error('Falha nos servidores do Google Gemini. Por favor, tente novamente em alguns segundos.')
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
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature
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
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ],
            temperature
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
  } else if (userFriendlyMessage.includes('high demand') || userFriendlyMessage.includes('Spikes in demand') || userFriendlyMessage.includes('503') || userFriendlyMessage.includes('Resource has been exhausted')) {
    userFriendlyMessage = 'Os servidores do Google Gemini estão enfrentando alta demanda temporária. O sistema realizou tentativas em múltiplos modelos alternativos; por favor, aguarde alguns instantes e tente novamente.'
  }

  throw new Error(`Não foi possível corrigir a redação no momento: ${userFriendlyMessage}`)
}

// Aliases para total compatibilidade retroativa com código existente
export const correctEssayWithGemini = correctEssayWithUniversalAI
export const correctEssayWithAI = correctEssayWithUniversalAI

/**
 * Gera uma proposta de redação aleatória e inédita no padrão oficial ENEM com textos motivadores densos
 * Utiliza o mesmo pool de chaves, rotação e failover da correção pedagógica
 */
export async function generateRandomEssayThemeWithAI({ axis, customInstruction, apiKey } = {}) {
  // 1. Obtém as chaves candidatas
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
    throw new Error('Nenhuma chave de Inteligência Artificial ativa foi cadastrada. Acesse o Painel Admin (/admin/chaves-api) para cadastrar sua chave de API.')
  }

  const axisPrompt = axis && axis !== 'ALEATORIO' && axis !== 'TODOS'
    ? `Eixo Temático Obrigatório: "${axis}". Desenvolva um tema especificamente focado neste eixo.`
    : `Selecione aleatoriamente um eixo temático instigante com alta probabilidade no ENEM (Sociedade e Cidadania, Ciência e Tecnologia, Saúde Pública e Mental, Meio Ambiente e Sustentabilidade, Educação e Cultura, Direitos Humanos ou Economia e Trabalho).`

  const userContent = `Elabore uma proposta oficial de redação dissertativo-argumentativa para o ENEM 2025/2026.
${axisPrompt}
${customInstruction ? `Instrução ou foco específico: ${customInstruction}\n` : ''}
REQUISITOS OBRIGATÓRIOS:
1. Tema inédito, contemporâneo e de grande impacto no Brasil.
2. Formulado no estilo clássico do INEP ("Desafios para...", "Caminhos para combater...", "A persistência de...", etc.).
3. 3 a 4 textos motivadores densos e realistas com fontes fidedignas (Texto I: dados estatísticos; Texto II: legislação/Constituição; Texto III: análise crítica social/causas).
4. Sugestões de repertórios socioculturais pertinentes e 2 núcleos argumentativos para direcionar o aluno.

Retorne EXCLUSIVAMENTE o objeto JSON com: title, axis, description, motivators, hints.`

  let lastError = null

  for (const keyObj of candidateKeys) {
    try {
      const parsedData = await callAiProvider(keyObj, userContent, {
        systemPrompt: THEME_GENERATION_SYSTEM_PROMPT,
        responseSchema: THEME_GENERATION_SCHEMA,
        temperature: 0.75, // Criatividade para gerar temas variados
        maxTokens: 4096
      })

      if (!parsedData || !parsedData.title) {
        throw new Error('Resposta da IA não contém os campos necessários da proposta temática.')
      }

      const motivators = Array.isArray(parsedData.motivators)
        ? parsedData.motivators.map((m, idx) => ({
            title: m.title || `Texto ${['I', 'II', 'III', 'IV'][idx] || idx + 1}`,
            content: typeof m.content === 'string' ? m.content.trim() : '',
            source: typeof m.source === 'string' ? m.source.trim() : 'Fonte: Dados Oficiais'
          })).filter(m => m.content.length > 0)
        : []

      const normalized = {
        title: String(parsedData.title).trim(),
        axis: String(parsedData.axis || axis || 'Geral').trim(),
        description: String(parsedData.description || `A partir da leitura dos textos motivadores seguintes e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo em modalidade escrita formal da língua portuguesa sobre o tema "${parsedData.title}", apresentando proposta de intervenção que respeite os direitos humanos. Selecione, organize e relacione, de forma coerente e coesa, argumentos e fatos para defesa de seu ponto de vista.`).trim(),
        motivators,
        hints: {
          repertorySuggestions: Array.isArray(parsedData.hints?.repertorySuggestions) ? parsedData.hints.repertorySuggestions : [],
          problemCores: Array.isArray(parsedData.hints?.problemCores) ? parsedData.hints.problemCores : []
        }
      }

      await recordKeyUsage(keyObj.id, { success: true })
      return normalized
    } catch (err) {
      console.warn(`[AI Theme Generator] Falha na chave "${keyObj.name}": ${err.message}`)
      lastError = err
      await recordKeyUsage(keyObj.id, { success: false, error: err.message })
    }
  }

  throw new Error(`Não foi possível gerar um tema aleatório no momento: ${lastError?.message || 'Falha na comunicação com a IA.'}`)
}

export const generateThemeWithAI = generateRandomEssayThemeWithAI

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

  // C1: Desvios e Falhas Sintáticas Detalhadas
  const rawC1 = data.competencies?.c1 || {}
  normalizedCompetencies.c1.desviosCount = Number(rawC1.desviosCount) || (Array.isArray(data.grammarErrors) ? data.grammarErrors.length : 0)
  normalizedCompetencies.c1.falhasSintaticasCount = Number(rawC1.falhasSintaticasCount) || 0
  normalizedCompetencies.c1.falhasSintaticas = Array.isArray(rawC1.falhasSintaticas)
    ? rawC1.falhasSintaticas.map(f => ({
        trecho: typeof f.trecho === 'string' ? f.trecho : '',
        tipo: typeof f.tipo === 'string' ? f.tipo : 'Truncamento ou Justaposição',
        explicacao: typeof f.explicacao === 'string' ? f.explicacao : ''
      }))
    : []

  // C2: Tema e Repertórios Socioculturais Validados
  const rawC2 = data.competencies?.c2 || {}
  normalizedCompetencies.c2.temaStatus = ['COMPLETA', 'TANGENCIAMENTO', 'FUGA'].includes(rawC2.temaStatus)
    ? rawC2.temaStatus
    : (scores.c2 <= 40 ? 'TANGENCIAMENTO' : 'COMPLETA')
  normalizedCompetencies.c2.temaAnalise = typeof rawC2.temaAnalise === 'string' ? rawC2.temaAnalise : ''
  normalizedCompetencies.c2.repertorios = Array.isArray(rawC2.repertorios)
    ? rawC2.repertorios.map(r => ({
        texto: typeof r.texto === 'string' ? r.texto : '',
        fonteArea: typeof r.fonteArea === 'string' ? r.fonteArea : 'Área do Conhecimento',
        legitimado: Boolean(r.legitimado),
        pertinente: Boolean(r.pertinente),
        produtivo: Boolean(r.produtivo),
        analise: typeof r.analise === 'string' ? r.analise : ''
      }))
    : []

  // C3: Projeto de Texto e Lacunas Argumentativas
  const rawC3 = data.competencies?.c3 || {}
  normalizedCompetencies.c3.teseIdentificada = typeof rawC3.teseIdentificada === 'string' ? rawC3.teseIdentificada : ''
  normalizedCompetencies.c3.lacunasArgumentativas = Array.isArray(rawC3.lacunasArgumentativas)
    ? rawC3.lacunasArgumentativas.map(l => ({
        paragrafo: Number(l.paragrafo) || 1,
        trecho: typeof l.trecho === 'string' ? l.trecho : '',
        explicacao: typeof l.explicacao === 'string' ? l.explicacao : '',
        comoResolver: typeof l.comoResolver === 'string' ? l.comoResolver : ''
      }))
    : []

  // C4: Operadores Inter e Intraparágrafos e Repetições
  const rawC4 = data.competencies?.c4 || {}
  normalizedCompetencies.c4.conectivosInter = {
    d1: rawC4.conectivosInter?.d1 || '',
    d2: rawC4.conectivosInter?.d2 || '',
    conclusao: rawC4.conectivosInter?.conclusao || '',
    atendeMinimoDois: typeof rawC4.conectivosInter?.atendeMinimoDois === 'boolean'
      ? rawC4.conectivosInter.atendeMinimoDois
      : scores.c4 >= 160
  }
  normalizedCompetencies.c4.repeticoesViciosas = Array.isArray(rawC4.repeticoesViciosas)
    ? rawC4.repeticoesViciosas.map(rep => ({
        palavra: typeof rep.palavra === 'string' ? rep.palavra : '',
        ocorrencias: Number(rep.ocorrencias) || 0,
        sinonimos: Array.isArray(rep.sinonimos) ? rep.sinonimos : []
      }))
    : []

  // C5: Elementos da proposta de intervenção
  const c5Score = scores.c5
  const rawElements = data.competencies?.c5?.interventionElements
  normalizedCompetencies.c5.interventionElements = {
    agente: typeof rawElements?.agente === 'boolean' ? rawElements.agente : c5Score >= 40,
    acao: typeof rawElements?.acao === 'boolean' ? rawElements.acao : c5Score >= 80,
    meioModo: typeof rawElements?.meioModo === 'boolean' ? rawElements.meioModo : c5Score >= 120,
    efeito: typeof rawElements?.efeito === 'boolean' ? rawElements.efeito : c5Score >= 160,
    detalhamento: typeof rawElements?.detalhamento === 'boolean' ? rawElements.detalhamento : c5Score === 200
  }

  const rawDet = data.competencies?.c5?.elementosDetalhados || {}
  normalizedCompetencies.c5.elementosDetalhados = {
    agente: {
      presente: typeof rawDet.agente?.presente === 'boolean' ? rawDet.agente.presente : normalizedCompetencies.c5.interventionElements.agente,
      trecho: rawDet.agente?.trecho || '',
      comentario: rawDet.agente?.comentario || ''
    },
    acao: {
      presente: typeof rawDet.acao?.presente === 'boolean' ? rawDet.acao.presente : normalizedCompetencies.c5.interventionElements.acao,
      trecho: rawDet.acao?.trecho || '',
      comentario: rawDet.acao?.comentario || ''
    },
    meioModo: {
      presente: typeof rawDet.meioModo?.presente === 'boolean' ? rawDet.meioModo.presente : normalizedCompetencies.c5.interventionElements.meioModo,
      trecho: rawDet.meioModo?.trecho || '',
      comentario: rawDet.meioModo?.comentario || ''
    },
    efeito: {
      presente: typeof rawDet.efeito?.presente === 'boolean' ? rawDet.efeito.presente : normalizedCompetencies.c5.interventionElements.efeito,
      trecho: rawDet.efeito?.trecho || '',
      comentario: rawDet.efeito?.comentario || ''
    },
    detalhamento: {
      presente: typeof rawDet.detalhamento?.presente === 'boolean' ? rawDet.detalhamento.presente : normalizedCompetencies.c5.interventionElements.detalhamento,
      trecho: rawDet.detalhamento?.trecho || '',
      comentario: rawDet.detalhamento?.comentario || ''
    }
  }
  normalizedCompetencies.c5.respeitaDireitosHumanos = typeof data.competencies?.c5?.respeitaDireitosHumanos === 'boolean'
    ? data.competencies.c5.respeitaDireitosHumanos
    : true
  normalizedCompetencies.c5.propostaCompletaSugerida = typeof data.competencies?.c5?.propostaCompletaSugerida === 'string'
    ? data.competencies.c5.propostaCompletaSugerida
    : ''

  // Reescrita Nota 1000 Pedagógica
  const rawWeak = data.weakestParagraph || {}
  const weakestParagraph = {
    numero: Number(rawWeak.numero) || 2,
    titulo: typeof rawWeak.titulo === 'string' ? rawWeak.titulo : 'Desenvolvimento 1',
    textoOriginal: typeof rawWeak.textoOriginal === 'string' ? rawWeak.textoOriginal : '',
    motivoPerdaNota: typeof rawWeak.motivoPerdaNota === 'string' ? rawWeak.motivoPerdaNota : 'Falta de aprofundamento do repertório sociocultural e conexão causal.',
    reescritaNota1000: typeof rawWeak.reescritaNota1000 === 'string' ? rawWeak.reescritaNota1000 : '',
    explicacaoPedagogica: typeof rawWeak.explicacaoPedagogica === 'string' ? rawWeak.explicacaoPedagogica : ''
  }

  // Destaques no próprio texto (Highlights coloridos)
  const textHighlights = Array.isArray(data.textHighlights)
    ? data.textHighlights.map(h => ({
        text: typeof h.text === 'string' ? h.text : '',
        type: ['C1_ERROR', 'C2_REPERTOIRE', 'C3_THESIS', 'C4_CONNECTOR', 'C5_ELEMENT'].includes(h.type) ? h.type : 'C1_ERROR',
        label: typeof h.label === 'string' ? h.label : '',
        comment: typeof h.comment === 'string' ? h.comment : ''
      })).filter(h => h.text)
    : []

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
    weakestParagraph,
    textHighlights,
    positivePoints,
    improvements,
    generalFeedback
  }
}
