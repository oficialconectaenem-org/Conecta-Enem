import prisma from '#server/utils/prisma'

let schemaEnsured = false

/**
 * Garante que colunas adicionadas recentemente existam no banco de dados
 * mesmo se a migração ainda não tiver sido rodada manualmente na produção (Vercel, Railway, etc).
 */
export async function ensureQuestionsSchema() {
  if (schemaEnsured) return

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`questions\` ADD COLUMN \`images\` LONGTEXT NULL;`)
  } catch (err) {
    // Coluna já existe ou sem permissão de alteração - prossegue normalmente
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`question_options\` ADD COLUMN \`image_url\` LONGTEXT NULL;`)
  } catch (err) {
    // Coluna já existe - prossegue
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`question_options\` MODIFY COLUMN \`text\` TEXT NULL;`)
  } catch (err) {
    // Já é nulo ou não suportado - prossegue
  }

  schemaEnsured = true
}
