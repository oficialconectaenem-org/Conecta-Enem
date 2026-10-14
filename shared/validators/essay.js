import { z } from 'zod'

/**
 * Escala de pontuação oficial do ENEM para cada competência (0 a 200 em passos de 40).
 */
export const ENEM_SCORE_STEPS = [0, 40, 80, 120, 160, 200]

export function isValidEnemScore(score) {
  const num = Number(score)
  return ENEM_SCORE_STEPS.includes(num)
}

const enemScoreSchema = z
  .union([z.number(), z.string()])
  .transform((val) => Number(val))
  .refine(
    (val) => ENEM_SCORE_STEPS.includes(val),
    {
      message: 'A nota de cada competência deve ser 0, 40, 80, 120, 160 ou 200.'
    }
  )

export const essayCorrectionSchema = z.object({
  c1Score: enemScoreSchema.default(0),
  c2Score: enemScoreSchema.default(0),
  c3Score: enemScoreSchema.default(0),
  c4Score: enemScoreSchema.default(0),
  c5Score: enemScoreSchema.default(0),

  c1Comment: z.string().nullable().optional(),
  c2Comment: z.string().nullable().optional(),
  c3Comment: z.string().nullable().optional(),
  c4Comment: z.string().nullable().optional(),
  c5Comment: z.string().nullable().optional(),

  justification1: z.string().nullable().optional(),
  justification2: z.string().nullable().optional(),
  justification3: z.string().nullable().optional(),
  justification4: z.string().nullable().optional(),
  justification5: z.string().nullable().optional(),

  positivePoints: z.string().nullable().optional(),
  improvements: z.string().nullable().optional(),
  generalComment: z.string().nullable().optional(),
  generalFeedback: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'CORRECTING', 'GRADED']).default('GRADED')
})

export const essaySubmissionSchema = z.object({
  theme: z
    .string()
    .trim()
    .min(3, 'O tema da redação deve possuir pelo menos 3 caracteres.')
    .max(300, 'Tema muito longo.'),

  title: z
    .string()
    .trim()
    .max(150, 'O título deve possuir no máximo 150 caracteres.')
    .optional()
    .nullable(),

  classroomId: z.string().trim().optional().nullable(),

  submissionType: z.enum(['TEXT', 'IMAGE']).default('TEXT'),

  content: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable()
}).refine((data) => {
  if (data.submissionType === 'TEXT') {
    return !!data.content && data.content.length >= 20
  }
  return true
}, {
  message: 'O texto da redação deve possuir pelo menos 20 caracteres.',
  path: ['content']
}).refine((data) => {
  if (data.submissionType === 'IMAGE') {
    return !!data.imageUrl && data.imageUrl.length > 0
  }
  return true
}, {
  message: 'A foto ou link da folha de redação é obrigatória.',
  path: ['imageUrl']
})
