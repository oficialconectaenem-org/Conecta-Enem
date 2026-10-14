/**
 * Utilitário Oficial de Métricas de Redação do ENEM
 * Utilizado de forma unificada tanto pelo Aluno quanto pelo Professor
 */

/**
 * Calcula linhas estimadas com quebra de palavras realista e justificada (word wrapping).
 * Calibrado precisamente para a folha padrão ENEM com texto justificado (110 caracteres por linha).
 */
export function calculateEnemLines(text, charsPerLine = 110) {
  if (!text || typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0

  // Normaliza quebras de linha e descarta linhas vazias no fim do texto
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
  const paragraphs = normalized.split('\n')
  let totalLines = 0

  for (const rawParagraph of paragraphs) {
    // Linha vazia intencional (espaço entre parágrafos)
    if (!rawParagraph.trim()) {
      totalLines += 1
      continue
    }

    // Simula quebra de linha real por palavras
    const words = rawParagraph.trim().split(/\s+/)
    let currentLineLen = 0
    let paragraphLines = 1

    for (const word of words) {
      const wordLen = word.length
      if (currentLineLen === 0) {
        currentLineLen = wordLen
      } else if (currentLineLen + 1 + wordLen <= charsPerLine) {
        currentLineLen += 1 + wordLen
      } else {
        paragraphLines += 1
        currentLineLen = wordLen
      }
    }

    totalLines += paragraphLines
  }

  return totalLines
}

/**
 * Analisa e extrai os parágrafos reais da redação.
 * Trata quebras de linha múltiplas, espaços e identifica se a 1ª linha é um título.
 */
export function extractParagraphs(text, title = '') {
  if (!text || typeof text !== 'string') return []
  
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  // Divide por quebras de linha e filtra apenas os blocos que contêm texto
  const rawBlocks = normalized
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (rawBlocks.length === 0) return []

  // Se o primeiro bloco for o título (ou tiver características de título curto seguido de parágrafos estruturados)
  let paragraphs = rawBlocks
  const firstBlock = rawBlocks[0]
  const isTitleMatch = title && firstBlock.toLowerCase() === title.trim().toLowerCase()
  const isHeadingLike = rawBlocks.length >= 4 && 
    firstBlock.length <= 80 && 
    firstBlock.split(/\s+/).length <= 14 && 
    !firstBlock.endsWith('.') &&
    rawBlocks[1].length > 100

  if (isTitleMatch || isHeadingLike) {
    paragraphs = rawBlocks.slice(1)
  }

  return paragraphs
}

/**
 * Análise completa de métricas da redação.
 */
export function calculateEssayMetrics(text, title = '') {
  if (!text || typeof text !== 'string') {
    return {
      words: 0,
      paragraphs: 0,
      lines: 0,
      sentences: 0,
      characters: 0,
      charactersNoSpaces: 0,
      paragraphsList: [],
      linesStatus: {
        count: 0,
        text: '0 / 30 linhas',
        badge: 'Folha em branco',
        variant: 'empty',
        isValid: false
      },
      paragraphStatus: {
        count: 0,
        badge: 'Nenhum parágrafo',
        variant: 'empty',
        isIdeal: false
      },
      wordsStatus: {
        count: 0,
        badge: 'Sem palavras',
        variant: 'empty'
      }
    }
  }

  const trimmed = text.trim()

  // 1. Palavras
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0

  // 2. Parágrafos reais
  const paragraphsList = extractParagraphs(text, title)
  const paragraphCount = paragraphsList.length

  // 3. Linhas (1 a 30 padrão ENEM)
  const lines = calculateEnemLines(text)

  // 4. Frases / Períodos
  const sentences = trimmed
    ? trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    : 0

  // 5. Caracteres
  const characters = text.length
  const charactersNoSpaces = text.replace(/\s/g, '').length

  // Status de Linhas ENEM
  let linesStatus = {
    count: lines,
    text: `${lines} / 30 linhas`,
    badge: 'Folha em branco',
    variant: 'empty',
    isValid: false
  }

  if (lines === 0) {
    linesStatus = {
      count: 0,
      text: '0 / 30 linhas',
      badge: 'Folha em branco',
      variant: 'empty',
      isValid: false
    }
  } else if (lines < 8) {
    linesStatus = {
      count: lines,
      text: `${lines} / 30 linhas`,
      badge: 'Menos de 8 linhas (Nota Zero no ENEM)',
      variant: 'insufficient',
      isValid: false
    }
  } else if (lines <= 30) {
    linesStatus = {
      count: lines,
      text: `${lines} / 30 linhas`,
      badge: 'Extensão oficial ideal (8 a 30)',
      variant: 'ideal',
      isValid: true
    }
  } else {
    linesStatus = {
      count: lines,
      text: `${lines} / 30 linhas`,
      badge: `Ultrapassou limite em ${lines - 30} linha(s)!`,
      variant: 'overflow',
      isValid: false
    }
  }

  // Status de Parágrafos ENEM (padrão 4 parágrafos: Introdução, D1, D2, Conclusão)
  let paragraphStatus = {
    count: paragraphCount,
    badge: 'Nenhum parágrafo',
    variant: 'empty',
    isIdeal: false
  }

  if (paragraphCount === 0) {
    paragraphStatus = {
      count: 0,
      badge: 'Nenhum parágrafo',
      variant: 'empty',
      isIdeal: false
    }
  } else if (paragraphCount < 3) {
    paragraphStatus = {
      count: paragraphCount,
      badge: `${paragraphCount} parágrafo(s) • Estrutura incompleta (mínimo 3 a 4)`,
      variant: 'warning',
      isIdeal: false
    }
  } else if (paragraphCount === 4) {
    paragraphStatus = {
      count: 4,
      badge: '4 parágrafos • Estrutura oficial ideal (Intro, D1, D2, Conclusão)',
      variant: 'ideal',
      isIdeal: true
    }
  } else if (paragraphCount === 3 || paragraphCount === 5) {
    paragraphStatus = {
      count: paragraphCount,
      badge: `${paragraphCount} parágrafos • Estrutura aceitável`,
      variant: 'acceptable',
      isIdeal: false
    }
  } else {
    paragraphStatus = {
      count: paragraphCount,
      badge: `${paragraphCount} parágrafos • Muitos parágrafos fragmentados`,
      variant: 'warning',
      isIdeal: false
    }
  }

  // Status de Palavras
  let wordsStatus = {
    count: words,
    badge: 'Ideal: 250 a 350',
    variant: 'empty'
  }

  if (words >= 250 && words <= 350) {
    wordsStatus = {
      count: words,
      badge: 'Extensão ideal de vocabulário',
      variant: 'ideal'
    }
  } else if (words > 0 && words < 150) {
    wordsStatus = {
      count: words,
      badge: 'Poucas palavras para o ENEM',
      variant: 'warning'
    }
  } else if (words >= 150 && words < 250) {
    wordsStatus = {
      count: words,
      badge: 'Extensão moderada',
      variant: 'acceptable'
    }
  } else if (words > 350) {
    wordsStatus = {
      count: words,
      badge: 'Extensão longa (cuidado com o limite de 30 linhas)',
      variant: 'acceptable'
    }
  }

  return {
    words,
    paragraphs: paragraphCount,
    lines,
    sentences,
    characters,
    charactersNoSpaces,
    paragraphsList,
    linesStatus,
    paragraphStatus,
    wordsStatus
  }
}
