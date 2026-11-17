import prisma from '#server/utils/prisma'

export default defineEventHandler(async () => {
  try {
    const userCount = await prisma.user.count()
    return {
      success: true,
      database: 'connected',
      usersCount: userCount
    }
  } catch (error) {
    return {
      success: false,
      database: 'error',
      message: error?.message,
      code: error?.code
    }
  }
})
