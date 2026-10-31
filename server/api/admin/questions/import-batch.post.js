import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '#server/utils/prisma'
import { requireAdmin } from '#server/utils/require-admin'
import { ensureQuestionsSchema } from '#server/utils/ensure-schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await ensureQuestionsSchema()

  const body = await readBody(event)
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : []

  if (rawQuestions.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nenhuma questão fornecida para importação.'
    })
  }

  // Busca matérias válidas do banco para resolução e fallback
  const validSubjects = await prisma.subject.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true }
  })

  if (validSubjects.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nenhuma matéria cadastrada no sistema. Cadastre matérias antes de importar questões.'
    })
  }

  const defaultSubjectId = validSubjects[0].id

  const results = []
  const errors = []

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i]
    const index = i + 1

    try {
      const statement = typeof q.statement === 'string' ? q.statement.trim() : ''
      if (!statement) {
        throw new Error(`Questão #${index}: Enunciado não informado.`)
      }

      // Resolução da matéria (ID, Slug ou Nome)
      let resolvedSubjectId = q.subjectId
      if (!resolvedSubjectId || !validSubjects.some(s => s.id === resolvedSubjectId)) {
        if (q.subjectSlug || q.subjectName) {
          const matched = validSubjects.find(s =>
            s.slug.toLowerCase() === String(q.subjectSlug || '').toLowerCase() ||
            s.name.toLowerCase() === String(q.subjectName || '').toLowerCase()
          )
          resolvedSubjectId = matched ? matched.id : defaultSubjectId
        } else {
          resolvedSubjectId = defaultSubjectId
        }
      }

      // Resolução do gabarito (A, B, C, D, E)
      const rawGabarito = String(q.correctAnswer || q.gabarito || 'A').toUpperCase().trim()
      const validLetters = ['A', 'B', 'C', 'D', 'E']
      const correctAnswer = validLetters.includes(rawGabarito) ? rawGabarito : 'A'

      // Resolução da dificuldade (EASY, MEDIUM, HARD)
      let difficulty = 'MEDIUM'
      const rawDiff = String(q.difficulty || q.dificuldade || '').toUpperCase().trim()
      if (rawDiff === 'EASY' || rawDiff === 'FACIL' || rawDiff === 'FÁCIL') difficulty = 'EASY'
      else if (rawDiff === 'HARD' || rawDiff === 'DIFICIL' || rawDiff === 'DIFÍCIL') difficulty = 'HARD'

      // Resolução das alternativas (A-E) garantindo deduplicação estrita
      const optionsMap = new Map()

      if (Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach((opt, idx) => {
          const rawLetter = opt?.letter ? String(opt.letter).toUpperCase().trim() : ''
          const letter = validLetters.includes(rawLetter) ? rawLetter : (validLetters[idx] || 'A')
          if (!optionsMap.has(letter)) {
            optionsMap.set(letter, {
              letter,
              text: String(opt?.text || opt?.texto || '').trim(),
              imageUrl: opt?.imageUrl ? String(opt.imageUrl).trim() : null
            })
          }
        })
      } else if (q.alternativas && typeof q.alternativas === 'object') {
        validLetters.forEach(letter => {
          optionsMap.set(letter, {
            letter,
            text: String(q.alternativas[letter] || q.alternativas[letter.toLowerCase()] || '').trim(),
            imageUrl: null
          })
        })
      }

      // Garante que existam exatamente as 5 alternativas de A a E
      for (const letter of validLetters) {
        if (!optionsMap.has(letter)) {
          optionsMap.set(letter, {
            letter,
            text: `Alternativa ${letter}`,
            imageUrl: null
          })
        }
      }

      const finalOptions = validLetters.map(l => optionsMap.get(l))

      // Tratamento de imagens
      let imagesList = []
      if (Array.isArray(q.images)) {
        imagesList = q.images
          .map((img, idx) => {
            if (typeof img === 'string' && img.trim()) return { url: img.trim(), title: `Imagem ${idx + 1}` }
            if (img && typeof img === 'object' && img.url) return { url: String(img.url).trim(), title: img.title || `Imagem ${idx + 1}` }
            return null
          })
          .filter(Boolean)
      } else if (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl.trim()) {
        imagesList = [{ url: q.imageUrl.trim(), title: 'Imagem 1' }]
      }

      const primaryImageUrl = imagesList[0]?.url || (typeof q.imageUrl === 'string' ? q.imageUrl.trim() : null)
      const imagesJson = imagesList.length > 0 ? JSON.stringify(imagesList) : null

      const created = await prisma.question.create({
        data: {
          subjectId: resolvedSubjectId,
          title: q.title ? String(q.title).trim() : null,
          statement,
          explanation: q.explanation ? String(q.explanation).trim() : null,
          imageUrl: primaryImageUrl,
          images: imagesJson,
          difficulty,
          year: q.year ? Number(q.year) : new Date().getFullYear(),
          correctAnswer,
          active: q.active !== undefined ? Boolean(q.active) : true,
          options: {
            create: finalOptions.map(opt => ({
              letter: opt.letter,
              text: opt.text,
              imageUrl: opt.imageUrl
            }))
          }
        },
        include: {
          subject: true,
          options: {
            orderBy: { letter: 'asc' }
          }
        }
      })

      results.push(created)
    } catch (err) {
      console.warn(`[Import Batch] Erro na questão #${index}:`, err.message)
      errors.push({ index, error: err.message })
    }
  }

  return {
    success: results.length > 0,
    totalReceived: rawQuestions.length,
    importedCount: results.length,
    failedCount: errors.length,
    errors,
    message: `${results.length} questão(ões) adicionada(s) com sucesso ao banco!`
  }
})
