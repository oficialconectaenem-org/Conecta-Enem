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

  if (query.search) {
    const searchStr = String(query.search).trim()
    if (searchStr) {
      where.OR = [
        { statement: { contains: searchStr } },
        { title: { contains: searchStr } }
      ]
    }
  }

  const isSummary = query.summary === 'true'
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
      orderBy: [
        { year: "desc" },
        { createdAt: "desc" }
      ]
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
