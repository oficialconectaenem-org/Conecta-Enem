/**
 * Utilitário de Estimativa TRI (Teoria de Resposta ao Item) para o ENEM.
 * No ENEM real, as notas não são uma simples regra de três: a coerência pedagógica
 * (acertar fáceis antes de médias e difíceis) define se houve chute ou real domínio.
 */

const DIFFICULTY_WEIGHTS = {
  EASY: { b: -1.2, weight: 1.0 },
  MEDIUM: { b: 0.0, weight: 1.5 },
  HARD: { b: 1.2, weight: 2.0 }
}

/**
 * Calcula a pontuação estimada na escala ENEM (300 a 1000).
 *
 * @param {Array<{ difficulty?: string, isCorrect: boolean }>} items - Lista de questões respondidas com status de acerto
 * @returns {{
 *   score: number,
 *   correctCount: number,
 *   totalCount: number,
 *   percentage: number,
 *   coherence: 'ALTA' | 'MEDIA' | 'BAIXA'
 * }}
 */
export function calculateTriScore(items = []) {
  if (!items || items.length === 0) {
    return {
      score: 0,
      correctCount: 0,
      totalCount: 0,
      percentage: 0,
      coherence: 'MEDIA'
    }
  }

  let easyCorrect = 0
  let easyTotal = 0
  let mediumCorrect = 0
  let mediumTotal = 0
  let hardCorrect = 0
  let hardTotal = 0

  let totalCorrect = 0

  for (const item of items) {
    const diff = (item.difficulty || 'MEDIUM').toUpperCase()
    const correct = Boolean(item.isCorrect)

    if (correct) {
      totalCorrect++
    }

    if (diff === 'EASY') {
      easyTotal++
      if (correct) easyCorrect++
    } else if (diff === 'HARD') {
      hardTotal++
      if (correct) hardCorrect++
    } else {
      mediumTotal++
      if (correct) mediumCorrect++
    }
  }

  const total = items.length
  const percentage = Math.round((totalCorrect / total) * 100)

  // Se errou tudo: nota base mínima (~320 a 350)
  if (totalCorrect === 0) {
    return {
      score: 320,
      correctCount: 0,
      totalCount: total,
      percentage: 0,
      coherence: 'ALTA'
    }
  }

  // Se acertou tudo: nota máxima (~980 a 1000)
  if (totalCorrect === total) {
    return {
      score: 990,
      correctCount: total,
      totalCount: total,
      percentage: 100,
      coherence: 'ALTA'
    }
  }

  // Análise de Coerência Pedagógica (TRI)
  // Taxa de acerto em fáceis vs difíceis
  const easyRate = easyTotal > 0 ? easyCorrect / easyTotal : 0.5
  const mediumRate = mediumTotal > 0 ? mediumCorrect / mediumTotal : 0.5
  const hardRate = hardTotal > 0 ? hardCorrect / hardTotal : 0.5

  let coherence = 'ALTA'
  let coherenceFactor = 1.0

  // Se acertou mais difíceis do que fáceis, o padrão indica probabilidade de chute
  if (hardRate > easyRate + 0.25 && totalCorrect > 2) {
    coherence = 'BAIXA'
    coherenceFactor = 0.82 // Penalização de consistência
  } else if (hardRate > easyRate) {
    coherence = 'MEDIA'
    coherenceFactor = 0.92
  } else if (easyRate >= mediumRate && mediumRate >= hardRate) {
    coherence = 'ALTA'
    coherenceFactor = 1.05 // Bonificação por consistência
  }

  // Cálculo ponderado das questões
  let weightedPoints = 0
  let maxPossiblePoints = 0

  for (const item of items) {
    const diff = (item.difficulty || 'MEDIUM').toUpperCase()
    const weightInfo = DIFFICULTY_WEIGHTS[diff] || DIFFICULTY_WEIGHTS.MEDIUM
    maxPossiblePoints += weightInfo.weight

    if (item.isCorrect) {
      weightedPoints += weightInfo.weight
    }
  }

  const normalizedRatio = maxPossiblePoints > 0 ? (weightedPoints / maxPossiblePoints) : (totalCorrect / total)

  // Escala ENEM padrão: base 320, teto 980
  const baseScore = 320
  const scoreSpan = 660

  const calculatedScore = Math.round(baseScore + (scoreSpan * normalizedRatio * coherenceFactor))
  const finalScore = Math.max(320, Math.min(990, calculatedScore))

  return {
    score: finalScore,
    correctCount: totalCorrect,
    totalCount: total,
    percentage,
    coherence
  }
}
