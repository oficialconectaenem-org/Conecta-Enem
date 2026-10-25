import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '#server/utils/prisma'
import { requireAdmin } from '#server/utils/require-admin.js'

// Mapeamento de matérias escolares específicas
const DETAILED_SUBJECTS = {
  matematica: { name: 'Matemática', slug: 'matematica', order: 1 },
  biologia: { name: 'Biologia', slug: 'biologia', order: 2 },
  fisica: { name: 'Física', slug: 'fisica', order: 3 },
  quimica: { name: 'Química', slug: 'quimica', order: 4 },
  historia: { name: 'História', slug: 'historia', order: 5 },
  geografia: { name: 'Geografia', slug: 'geografia', order: 6 },
  filosofia: { name: 'Filosofia', slug: 'filosofia', order: 7 },
  sociologia: { name: 'Sociologia', slug: 'sociologia', order: 8 },
  portugues: { name: 'Português & Literatura', slug: 'portugues', order: 9 },
  ingles: { name: 'Língua Inglesa', slug: 'ingles', order: 10 },
  espanhol: { name: 'Língua Espanhola', slug: 'espanhol', order: 11 },
  artes: { name: 'Artes & Educação Física', slug: 'artes', order: 12 }
}

const NATUREZA_KEYWORDS = {
  fisica: ['velocidade', 'aceleração', 'força', 'atrito', 'gravidade', 'cinética', 'potencial', 'joule', 'newton', 'circuito', 'corrente', 'volt', 'resistor', 'potência', 'magnético', 'onda', 'frequência', 'reflexão', 'refração', 'óptica', 'calor', 'termodinâmica', 'temperatura', 'pressão', 'empuxo', 'densidade'],
  quimica: ['átomo', 'elétron', 'mol', 'molar', 'reação', 'estequiometria', 'ligação química', 'ácido', 'base', 'ph', 'solução', 'concentração', 'equilíbrio químico', 'oxidação', 'redução', 'pilha', 'tabela periódica', 'carbono', 'orgânica', 'hidrocarboneto', 'álcool', 'polímero', 'entalpia'],
  biologia: ['célula', 'dna', 'rna', 'gene', 'genética', 'mutação', 'fotossíntese', 'mitocôndria', 'ecologia', 'ecossistema', 'cadeia alimentar', 'biodiversidade', 'bioma', 'evolução', 'darwin', 'seleção natural', 'vírus', 'bactéria', 'vacina', 'imunidade', 'fisiologia', 'neurônio', 'digestão', 'planta']
}

const HUMANAS_KEYWORDS = {
  filosofia: ['filósofo', 'platão', 'aristóteles', 'kant', 'descartes', 'sêneca', 'nietzsche', 'ética', 'moral', 'razão', 'epistemologia', 'metafísica', 'verdade', 'virtude', 'existencialismo', 'iluminismo'],
  sociologia: ['sociólogo', 'marx', 'weber', 'durkheim', 'foucault', 'sociedade', 'classe social', 'estratificação', 'trabalho', 'alienação', 'capitalismo', 'burguesia', 'desigualdade', 'movimentos sociais', 'identidade', 'cidadania'],
  geografia: ['clima', 'relevo', 'vegetação', 'cerrado', 'caatinga', 'amazônia', 'bacia hidrográfica', 'placas tectônicas', 'solo', 'urbanização', 'metrópole', 'migração', 'demografia', 'agronegócio', 'globalização', 'geopolítica', 'latitude'],
  historia: ['século', 'império', 'colônia', 'república', 'escravidão', 'ditadura', 'constituição', 'revolução', 'guerra', 'independência', 'idade média', 'antiguidade', 'roma', 'grécia', 'renascimento', 'era vargas', 'regime militar']
}

function countKeywords(text, keywords) {
  let score = 0
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const regex = new RegExp(`\\b${kw}`, 'gi')
    const matches = lower.match(regex)
    if (matches) score += matches.length
  }
  return score
}

function identifySubject(q) {
  const discipline = q.discipline
  const language = q.language?.toLowerCase()
  const text = `${q.context || ''} ${q.alternativesIntroduction || ''} ${q.title || ''}`

  if (language === 'ingles' || (discipline === 'linguagens' && q.index <= 5 && language === 'ingles')) return 'ingles'
  if (language === 'espanhol' || (discipline === 'linguagens' && q.index <= 5 && language === 'espanhol')) return 'espanhol'
  if (discipline === 'matematica') return 'matematica'

  if (discipline === 'ciencias-natureza') {
    const scoreFisica = countKeywords(text, NATUREZA_KEYWORDS.fisica)
    const scoreQuimica = countKeywords(text, NATUREZA_KEYWORDS.quimica)
    const scoreBiologia = countKeywords(text, NATUREZA_KEYWORDS.biologia)

    if (scoreFisica > scoreQuimica && scoreFisica > scoreBiologia) return 'fisica'
    if (scoreQuimica > scoreFisica && scoreQuimica > scoreBiologia) return 'quimica'
    if (scoreBiologia > 0) return 'biologia'

    const mod = q.index % 3
    if (mod === 0) return 'fisica'
    if (mod === 1) return 'quimica'
    return 'biologia'
  }

  if (discipline === 'ciencias-humanas') {
    const scoreFilo = countKeywords(text, HUMANAS_KEYWORDS.filosofia)
    const scoreSocio = countKeywords(text, HUMANAS_KEYWORDS.sociologia)
    const scoreGeo = countKeywords(text, HUMANAS_KEYWORDS.geografia)
    const scoreHist = countKeywords(text, HUMANAS_KEYWORDS.historia)

    if (scoreFilo > scoreSocio && scoreFilo > scoreGeo && scoreHist) return 'filosofia'
    if (scoreSocio > scoreFilo && scoreSocio > scoreGeo && scoreHist) return 'sociologia'
    if (scoreGeo > scoreFilo && scoreGeo > scoreSocio && scoreHist) return 'geografia'
    if (scoreHist > 0) return 'historia'

    const mod = q.index % 4
    if (mod === 0) return 'historia'
    if (mod === 1) return 'geografia'
    if (mod === 2) return 'filosofia'
    return 'sociologia'
  }

  if (discipline === 'linguagens') {
    const scoreArtes = countKeywords(text, ['arte', 'pintura', 'escultura', 'quadro', 'museu', 'modernismo', 'vanguarda', 'dança', 'teatro'])
    if (scoreArtes >= 2) return 'artes'
    return 'portugues'
  }

  return 'portugues'
}

function calculateDifficulty(q) {
  const statement = `${q.context || ''} ${q.alternativesIntroduction || ''}`
  const length = statement.length
  const hasFormulas = /[0-9]+\s*[xX\+\-\*\/\^=]\s*[0-9]+|10\^|log|sen|cos|tg|Δ|λ|Ω|μ/i.test(statement)
  const hasMultipleTexts = /(?:TEXTO\s+[IVXLCDM\d]+)/i.test(statement)
  const isHighDensitySubject = ['filosofia', 'fisica', 'quimica'].includes(q.discipline)

  if (length < 400 && !hasFormulas && !hasMultipleTexts) return 'EASY'
  if (length > 1400 || (hasFormulas && hasMultipleTexts) || (isHighDensitySubject && length > 1000)) return 'HARD'

  const hash = (q.index * 7 + length) % 10
  if (hash <= 2) return 'EASY'
  if (hash >= 8) return 'HARD'
  return 'MEDIUM'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    const body = await readBody(event)
  const year = Number(body?.year) || 2023

  if (year < 2009 || year > 2030) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ano inválido para importação do ENEM.'
    })
  }

  // 1. Garantir que as matérias específicas existem
  const subjectCache = new Map()
  for (const [slugKey, sData] of Object.entries(DETAILED_SUBJECTS)) {
    const subject = await prisma.subject.upsert({
      where: { slug: sData.slug },
      update: { name: sData.name, order: sData.order, active: true },
      create: { name: sData.name, slug: sData.slug, order: sData.order, active: true }
    })
    subjectCache.set(slugKey, subject.id)
  }

  // 2. Baixar questões da API externa
  let allQuestions = []
  let offset = 0
  const limit = 50
  let hasMore = true

  while (hasMore) {
    const url = `https://api.enem.dev/v1/exams/${year}/questions?limit=${limit}&offset=${offset}`
    const response = await fetch(url)
    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `Falha ao conectar com api.enem.dev (HTTP ${response.status})`
      })
    }

    const data = await response.json()
    const batch = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : [])
    if (batch.length === 0) break

    allQuestions.push(...batch)
    offset += limit
    if (data.metadata?.hasMore === false || (data.metadata?.total && allQuestions.length >= data.metadata.total)) {
      hasMore = false
    }
  }

    // 3. Processar em lotes paralelos rápidos (evita timeout de 10s no Vercel/servidor)
    const existingQuestions = await prisma.question.findMany({
      where: { year },
      select: { id: true, title: true }
    })
    const existingMap = new Map(existingQuestions.map(q => [q.title, q.id]))

    let importedCount = 0
    let updatedCount = 0
    const validLetters = ['A', 'B', 'C', 'D', 'E']

    const CHUNK_SIZE = 15
    for (let i = 0; i < allQuestions.length; i += CHUNK_SIZE) {
      const chunk = allQuestions.slice(i, i + CHUNK_SIZE)

      await Promise.all(chunk.map(async (q) => {
        const correctLetter = q.correctAlternative?.trim()?.toUpperCase()
        if (!correctLetter || !validLetters.includes(correctLetter)) return

        const detectedSlug = identifySubject(q)
        const subjectId = subjectCache.get(detectedSlug) || subjectCache.get('portugues')
        const difficulty = calculateDifficulty(q)
        const title = q.title || `Questão ${q.index} - ENEM ${year}`

        let statementParts = []
        if (q.context && q.context.trim()) statementParts.push(q.context.trim())
        if (q.alternativesIntroduction && q.alternativesIntroduction.trim()) statementParts.push(q.alternativesIntroduction.trim())
        const statement = statementParts.join('\n\n') || `Questão do ENEM ${year}`

        const primaryImage = Array.isArray(q.files) && q.files.length > 0 ? q.files[0] : null
        const allImagesJson = Array.isArray(q.files) && q.files.length > 0 ? JSON.stringify(q.files) : null

        const existingId = existingMap.get(title)

        const alternativesData = (Array.isArray(q.alternatives) ? q.alternatives : [])
          .filter(alt => validLetters.includes(alt.letter?.trim()?.toUpperCase()))
          .map(alt => ({
            letter: alt.letter.trim().toUpperCase(),
            text: alt.text || '',
            imageUrl: alt.file || null
          }))

        const hasEnoughOptions = alternativesData.length >= 5
        const emptyCount = alternativesData.filter(o => !o.text && !o.imageUrl).length
        const isActive = hasEnoughOptions && emptyCount <= 1

        if (existingId) {
          await prisma.question.update({
            where: { id: existingId },
            data: {
              statement,
              correctAnswer: correctLetter,
              imageUrl: primaryImage,
              images: allImagesJson,
              subjectId,
              difficulty,
              active: isActive
            }
          })
          updatedCount++
        } else {
          await prisma.question.create({
            data: {
              subjectId,
              title,
              statement,
              difficulty,
              year,
              correctAnswer: correctLetter,
              imageUrl: primaryImage,
              images: allImagesJson,
              active: isActive,
              options: {
                create: alternativesData
              }
            }
          })
          importedCount++
        }
      }))
    }

    return {
      success: true,
      year,
      totalDownloaded: allQuestions.length,
      imported: importedCount,
      updated: updatedCount
    }
  } catch (err) {
    console.error('❌ Erro na importação do ENEM:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || err.message || 'Erro ao processar importação do ENEM.'
    })
  }
})
