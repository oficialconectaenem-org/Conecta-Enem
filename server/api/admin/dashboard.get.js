import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // 1. Contagens gerais em paralelo
    const [
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalQuestions,
      totalSubjects,
      totalModules,
      totalLessons,
      totalEssays,
      totalClassrooms,
      totalClassroomMembers,
      completedLessons,
      totalAnswers,
      correctAnswers,
      easyQuestions,
      mediumQuestions,
      hardQuestions,
      gradedEssays,
      pendingEssays,
      correctingEssays,
      aiGradedEssays,
      teacherEssays,
      essayScoreAvg,
      band0_400,
      band400_600,
      band600_800,
      band800_1000,
      subjectsWithQuestions
    ] = await Promise.all([
      // Usuários
      prisma.user.count({ where: { role: 'STUDENT' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'TEACHER' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0),
      // Conteúdo
      prisma.question.count().catch(() => 0),
      prisma.subject.count().catch(() => 0),
      prisma.module.count().catch(() => 0),
      prisma.lesson.count().catch(() => 0),
      prisma.essay.count().catch(() => 0),
      // Turmas
      prisma.classroom.count().catch(() => 0),
      prisma.classroomMember.count().catch(() => 0),
      // Progresso de aulas
      prisma.lessonProgress.count({ where: { completed: true } }).catch(() => 0),
      // Respostas a questões
      prisma.questionAnswer.count().catch(() => 0),
      prisma.questionAnswer.count({ where: { isCorrect: true } }).catch(() => 0),
      // Questões por dificuldade
      prisma.question.count({ where: { difficulty: 'EASY' } }).catch(() => 0),
      prisma.question.count({ where: { difficulty: 'MEDIUM' } }).catch(() => 0),
      prisma.question.count({ where: { difficulty: 'HARD' } }).catch(() => 0),
      // Redações por status
      prisma.essay.count({ where: { status: 'GRADED' } }).catch(() => 0),
      prisma.essay.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.essay.count({ where: { status: 'CORRECTING' } }).catch(() => 0),
      // Redações corrigidas por IA vs Turmas de Professores
      prisma.essay.count({ where: { classroomId: null, status: 'GRADED' } }).catch(() => 0),
      prisma.essay.count({ where: { classroomId: { not: null } } }).catch(() => 0),
      // Média de pontuação em correções
      prisma.essayCorrection.aggregate({
        _avg: { totalScore: true }
      }).catch(() => ({ _avg: { totalScore: 0 } })),
      // Faixas de nota
      prisma.essayCorrection.count({ where: { totalScore: { lte: 400 } } }).catch(() => 0),
      prisma.essayCorrection.count({ where: { totalScore: { gt: 400, lte: 600 } } }).catch(() => 0),
      prisma.essayCorrection.count({ where: { totalScore: { gt: 600, lte: 800 } } }).catch(() => 0),
      prisma.essayCorrection.count({ where: { totalScore: { gt: 800 } } }).catch(() => 0),
      // Top matérias com questões
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          color: true,
          _count: { select: { questions: true } }
        },
        orderBy: {
          questions: { _count: 'desc' }
        },
        take: 5
      }).catch(() => [])
    ])

    // Cálculo da taxa de acerto global em questões
    const incorrectAnswers = Math.max(0, totalAnswers - correctAnswers)
    const accuracyRate = totalAnswers > 0
      ? Math.round((correctAnswers / totalAnswers) * 100)
      : 0

    // Média de nota das redações
    const averageScore = essayScoreAvg?._avg?.totalScore
      ? Math.round(essayScoreAvg._avg.totalScore)
      : 0

    // Período dinâmico do gráfico (2 dias, 7 dias, 15 dias, 30 dias)
    const query = getQuery(event)
    const validDays = [2, 7, 15, 30]
    const parsedDays = parseInt(query?.days, 10)
    const days = validDays.includes(parsedDays) ? parsedDays : 7

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    // Busca registros recentes para agrupar por dia (incluindo distinção de redações IA)
    const [recentUsers, recentAnswers, recentSubmissions] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      }).catch(() => []),
      prisma.questionAnswer.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true }
      }).catch(() => []),
      prisma.essay.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, classroomId: true, status: true }
      }).catch(() => [])
    ])

    const activityTimeline = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)

      // Se for 2 ou 7 dias: exibe dia da semana curto (ex: 'qui., 29')
      // Se for 15 ou 30 dias: exibe 'dia/mês' (ex: '29/10') para legibilidade
      const dayLabel = days <= 7
        ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

      const usersCount = recentUsers.filter(u => u.createdAt.toISOString().slice(0, 10) === dateStr).length
      const answersCount = recentAnswers.filter(a => a.createdAt.toISOString().slice(0, 10) === dateStr).length
      const dailyEssays = recentSubmissions.filter(e => e.createdAt.toISOString().slice(0, 10) === dateStr)
      const aiEssaysCount = dailyEssays.filter(e => e.classroomId === null && e.status === 'GRADED').length
      const teacherEssaysCount = dailyEssays.filter(e => e.classroomId !== null || e.status !== 'GRADED').length

      activityTimeline.push({
        date: dateStr,
        label: dayLabel,
        users: usersCount,
        questions: answersCount,
        essays: dailyEssays.length,
        aiEssays: aiEssaysCount,
        teacherEssays: teacherEssaysCount,
        total: usersCount + answersCount + dailyEssays.length
      })
    }

    return {
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalQuestions,
        totalSubjects,
        totalModules,
        totalLessons,
        totalEssays
      },
      userStats: {
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins,
        total: totalStudents + totalTeachers + totalAdmins,
        classrooms: totalClassrooms,
        classroomMembers: totalClassroomMembers
      },
      questionStats: {
        total: totalQuestions,
        easy: easyQuestions,
        medium: mediumQuestions,
        hard: hardQuestions,
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        accuracyRate,
        bySubject: (subjectsWithQuestions || []).map(s => ({
          name: s.name,
          color: s.color || '#7c3aed',
          count: s._count?.questions || 0
        }))
      },
      essayStats: {
        total: totalEssays,
        graded: gradedEssays,
        pending: pendingEssays,
        correcting: correctingEssays,
        aiGraded: aiGradedEssays,
        teacherGraded: teacherEssays,
        averageScore,
        bands: {
          band0_400,
          band400_600,
          band600_800,
          band800_1000
        }
      },
      platformUsage: {
        completedLessons,
        totalQuestionsAnswered: totalAnswers,
        totalEssaysSubmitted: totalEssays,
        totalSubjects,
        totalModules,
        totalLessons
      },
      activityTimeline,
      periodDays: days
    }
  } catch (err) {
    console.error('[Dashboard API] Erro ao carregar métricas:', err)
    return {
      success: false,
      error: 'Erro ao consolidar estatísticas do dashboard.',
      stats: {
        totalStudents: 0,
        totalTeachers: 0,
        totalQuestions: 0,
        totalSubjects: 0,
        totalModules: 0,
        totalLessons: 0,
        totalEssays: 0
      },
      userStats: { students: 0, teachers: 0, admins: 0, total: 0, classrooms: 0, classroomMembers: 0 },
      questionStats: { total: 0, easy: 0, medium: 0, hard: 0, totalAnswers: 0, correctAnswers: 0, incorrectAnswers: 0, accuracyRate: 0, bySubject: [] },
      essayStats: { total: 0, graded: 0, pending: 0, correcting: 0, averageScore: 0, bands: { band0_400: 0, band400_600: 0, band600_800: 0, band800_1000: 0 } },
      platformUsage: { completedLessons: 0, totalQuestionsAnswered: 0, totalEssaysSubmitted: 0, totalSubjects: 0, totalModules: 0, totalLessons: 0 },
      activityTimeline: []
    }
  }
})
