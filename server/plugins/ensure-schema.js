import { ensureQuestionsSchema } from '#server/utils/ensure-schema'
import { ensureApiKeysTable } from '#server/services/api-key.service'

export default defineNitroPlugin(async () => {
  try {
    await Promise.all([
      ensureQuestionsSchema().catch(err => console.warn('[Schema Sync Questions]:', err?.message)),
      ensureApiKeysTable().catch(err => console.warn('[Schema Sync ApiKeys]:', err?.message))
    ])
  } catch (err) {
    console.warn('[Schema Sync] Aviso geral ao sincronizar tabelas:', err?.message)
  }
})
