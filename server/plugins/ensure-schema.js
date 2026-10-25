import { ensureQuestionsSchema } from '#server/utils/ensure-schema'

export default defineNitroPlugin(async () => {
  try {
    await ensureQuestionsSchema()
  } catch (err) {
    console.warn('[Schema Sync] Aviso ao sincronizar colunas:', err?.message)
  }
})
