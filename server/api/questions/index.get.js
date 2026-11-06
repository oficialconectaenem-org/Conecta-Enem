import { defineEventHandler, getQuery, setHeader } from "h3"
import prisma from "#server/utils/prisma"

export default defineEventHandler(async (event) => {
  // Cache leve (15s navegador, 60s stale-while-revalidate) para navegação fluida
  setHeader(event, 'Cache-Control', 'public, max-age=15, stale-while-revalidate=60')

  const query = getQuery(event)
  const where = {}

  if (query.subjectId) {
    where.subjectId = String(query.subjectId)
  }

  if (query.difficulty) {
    where.difficulty = String(query.difficulty)
  }

  if (query.year) {
    where.year = Number(query.year)
  }

  if (query.status === "ACTIVE") {
    where.active = true
  } else if (query.status === "INACTIVE") {
    where.active = false
  }

  // Filtro de Mídia/Imagens
  if (query.hasImages === 'true') {
    where.OR = [
      { imageUrl: { not: null } },
      { images: { not: null } }
    ]
  } else if (query.hasImages === 'false') {
    where.AND = [
      { OR: [{ imageUrl: null }, { imageUrl: "" }] },
      { OR: [{ images: null }, { images: "" }, { images: "[]" }] }
    ]
  }

  // Filtro de Explicação/Gabarito Comentado
  if (query.hasExplanation === 'true') {
    where.AND = [
      ...(where.AND || []),
      { explanation: { not: null } },
      { explanation: { not: "" } }
    ]
  } else if (query.hasExplanation === 'false') {
    where.OR = [
      ...(where.OR || []),
      { explanation: null },
      { explanation: "" }
    ]
  }

  // Busca textual expandida (enunciado, título e alternativas)
  if (query.search) {
    const searchStr = String(query.search).trim()
    if (searchStr) {
      const searchConditions = [
        { statement: { contains: searchStr } },
        { title: { contains: searchStr } },
        { options: { some: { text: { contains: searchStr } } } }
      ]

      if (where.OR) {
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: searchConditions }
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }
  }

  // Ordenação flexível
  let orderBy = [{ year: "desc" }, { createdAt: "desc" }]
  if (query.sort === 'year_asc') {
    orderBy = [{ year: "asc" }, { createdAt: "desc" }]
  } else if (query.sort === 'newest') {
    orderBy = [{ createdAt: "desc" }]
  } else if (query.sort === 'oldest') {
    orderBy = [{ createdAt: "asc" }]
  } else if (query.sort === 'difficulty_asc') {
    orderBy = [{ difficulty: "asc" }, { year: "desc" }]
  } else if (query.sort === 'difficulty_desc') {
    orderBy = [{ difficulty: "desc" }, { year: "desc" }]
  }

  const limit = query.limit ? Math.min(Math.max(Number(query.limit), 1), 500) : undefined
  const page = query.page ? Math.max(Number(query.page), 1) : 1
  const skip = limit ? (page - 1) * limit : undefined

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      take: limit,
      skip,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        options: {
          select: {
            id: true,
            letter: true,
            text: true,
            imageUrl: true
          },
          orderBy: {
            letter: "asc"
          }
        }
      },
      orderBy
    }),
    limit ? prisma.question.count({ where }) : undefined
  ])

  return {
    success: true,
    data: questions,
    questions,
    total: total !== undefined ? total : questions.length,
    page,
    limit: limit || questions.length
  }
})
