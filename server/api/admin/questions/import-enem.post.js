import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '#server/utils/prisma'
import { requireAdmin } from '#server/utils/require-admin'
import { ensureQuestionsSchema } from '#server/utils/ensure-schema'
import { identifyQuestionSubject } from '#shared/utils/subject-classifier'

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

function identifySubject(q) {
  const discipline = q.discipline
  const language = q.language?.toLowerCase()

  if (language === 'ingles' || (discipline === 'linguagens' && q.index <= 5 && language === 'ingles')) return 'ingles'
  if (language === 'espanhol' || (discipline === 'linguagens' && q.index <= 5 && language === 'espanhol')) return 'espanhol'
  if (discipline === 'matematica') return 'matematica'

  // Utiliza o classificador semântico oficial de alta precisão
  const questionForClassifier = {
    statement: `${q.context || ''} ${q.alternativesIntroduction || ''}`,
    title: q.title || '',
    options: (q.alternatives || []).map(a => ({ text: a.text || '' })),
    language: q.language
  }

  return identifyQuestionSubject(questionForClassifier, null)
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
    await ensureQuestionsSchema()
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
    const fetchController = new AbortController()
    const fetchTimer = setTimeout(() => fetchController.abort(), 20000)

    let response
    try {
      response = await fetch(url, { signal: fetchController.signal })
    } catch (fErr) {
      clearTimeout(fetchTimer)
      throw createError({
        statusCode: 504,
        statusMessage: `Tempo limite esgotado ao contatar api.enem.dev para o ano ${year}. Tente novamente.`
      })
    }
    clearTimeout(fetchTimer)

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

        let primaryImage = null
        let allImagesJson = null
        if (Array.isArray(q.files) && q.files.length > 0) {
          const validFiles = q.files.map(f => {
            if (typeof f === 'string' && f.trim()) return f.trim()
            if (f && typeof f === 'object' && f.url) return String(f.url).trim()
            return null
          }).filter(Boolean)

          if (validFiles.length > 0) {
            primaryImage = validFiles[0]
            allImagesJson = JSON.stringify(validFiles)
          }
        }

        const existingId = existingMap.get(title)

        const seenLetters = new Set()
        const alternativesData = []
        for (const alt of (Array.isArray(q.alternatives) ? q.alternatives : [])) {
          const letter = alt.letter?.trim()?.toUpperCase()
          if (letter && validLetters.includes(letter) && !seenLetters.has(letter)) {
            seenLetters.add(letter)
            alternativesData.push({
              letter,
              text: alt.text ? String(alt.text).trim() : '',
              imageUrl: alt.file ? String(alt.file).trim() : null
            })
          }
        }

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

          for (const opt of alternativesData) {
            await prisma.questionOption.upsert({
              where: {
                questionId_letter: {
                  questionId: existingId,
                  letter: opt.letter
                }
              },
              update: {
                text: opt.text,
                imageUrl: opt.imageUrl
              },
              create: {
                questionId: existingId,
                letter: opt.letter,
                text: opt.text,
                imageUrl: opt.imageUrl
              }
            }).catch(() => null)
          }

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
