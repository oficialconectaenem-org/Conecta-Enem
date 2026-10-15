import { defineEventHandler, readBody, createError } from "h3"
import prisma from "#server/utils/prisma"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.statement || !body.statement.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enunciado é obrigatório."
    })
  }

  if (!body.subjectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Matéria é obrigatória."
    })
  }

  const rawOptions = Array.isArray(body.options) ? body.options : []
  const optionsData = rawOptions.map(option => ({
    letter: option.letter || "A",
    text: option.text?.trim() || "",
    imageUrl: option.imageUrl?.trim() || null
  }))

  let imagesList = []
  if (Array.isArray(body.images)) {
    imagesList = body.images
      .map(img => typeof img === "string" ? img.trim() : (img?.url || ""))
      .filter(Boolean)
  } else if (typeof body.images === "string" && body.images.trim()) {
    try {
      const parsed = JSON.parse(body.images)
      if (Array.isArray(parsed)) {
        imagesList = parsed
          .map(img => typeof img === "string" ? img.trim() : (img?.url || ""))
          .filter(Boolean)
      }
    } catch {
      imagesList = [body.images.trim()]
    }
  }

  if (!imagesList.length && body.imageUrl?.trim()) {
    imagesList = [body.imageUrl.trim()]
  }

  const primaryImageUrl = imagesList[0] || (body.imageUrl?.trim() || null)
  const imagesJson = imagesList.length > 0 ? JSON.stringify(imagesList) : null

  const question = await prisma.question.create({
    data: {
      subjectId: body.subjectId,
      title: body.title?.trim() || null,
      statement: body.statement.trim(),
      explanation: body.explanation?.trim() || null,
      imageUrl: primaryImageUrl,
      images: imagesJson,
      difficulty: body.difficulty || "MEDIUM",
      year: body.year ? Number(body.year) : null,
      correctAnswer: body.correctAnswer || "A",
      active: body.active !== undefined ? Boolean(body.active) : true,
      options: {
        create: optionsData
      }
    },
    include: {
      options: {
        orderBy: {
          letter: "asc"
        }
      },
      subject: true
    }
  })

  return {
    success: true,
    data: question,
    question
  }
})