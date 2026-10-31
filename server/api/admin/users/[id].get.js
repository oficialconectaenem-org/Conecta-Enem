import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAdmin } from '#server/utils/require-admin'
import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID do usuário não fornecido.'
    })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      enrollments: {
        include: {
          classroom: {
            select: {
              id: true,
              name: true,
              code: true,
              createdAt: true,
              teacher: {
                select: { id: true, name: true, email: true }
              },
              _count: {
                select: {
                  members: true,
                  essays: true
                }
              }
            }
          }
        }
      },
      classroomsLed: {
        select: {
          id: true,
          name: true,
          code: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
              essays: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuário não encontrado.'
    })
  }

  // Se for aluno, busca todo o histórico de atividades, questões, redações e aulas
  if (user.role === 'STUDENT') {
    const [questionAnswers, essays, lessonProgress] = await Promise.all([
      // 1. Resoluções de questões
      prisma.questionAnswer.findMany({
        where: { userId: id },
        select: {
          id: true,
          option: true,
          isCorrect: true,
          createdAt: true,
          question: {
            select: {
              id: true,
              statement: true,
              discipline: true,
              year: true,
              difficulty: true,
              subject: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []),

      // 2. Redações enviadas pelo aluno
      prisma.essay.findMany({
        where: { studentId: id },
        select: {
          id: true,
          theme: true,
          title: true,
          content: true,
          status: true,
          submissionType: true,
          classroomId: true,
          createdAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              teacher: {
                select: { id: true, name: true }
              }
            }
          },
          correction: {
            select: {
              id: true,
              totalScore: true,
              c1Score: true,
              c2Score: true,
              c3Score: true,
              c4Score: true,
              c5Score: true,
              c1Comment: true,
              c2Comment: true,
              c3Comment: true,
              c4Comment: true,
              c5Comment: true,
              generalComment: true,
              generalFeedback: true,
              positivePoints: true,
              improvements: true,
              createdAt: true,
              teacher: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []),

      // 3. Aulas concluídas
      prisma.lessonProgress.findMany({
        where: { userId: id, completed: true },
        select: {
          id: true,
          completed: true,
          createdAt: true,
          lesson: {
            select: {
              id: true,
              title: true,
              duration: true,
              module: {
                select: {
                  id: true,
                  title: true,
                  subject: {
                    select: { id: true, name: true, color: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => [])
    ])

    // Consolidação de estatísticas de Questões
    const totalQuestions = questionAnswers.length
    const correctQuestions = questionAnswers.filter(q => q.isCorrect).length
    const incorrectQuestions = totalQuestions - correctQuestions
    const accuracyRate = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0

    // Desempenho por Matéria / Disciplina
    const subjectMap = {}
    questionAnswers.forEach((ans) => {
      const subjectName = ans.question?.subject?.name || ans.question?.discipline || 'Geral'
      const subjectColor = ans.question?.subject?.color || '#8b5cf6'

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          name: subjectName,
          color: subjectColor,
          total: 0,
          correct: 0
        }
      }
      subjectMap[subjectName].total++
      if (ans.isCorrect) subjectMap[subjectName].correct++
    })

    const performanceBySubject = Object.values(subjectMap).map(s => ({
      ...s,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    })).sort((a, b) => b.total - a.total)

    // Consolidação de estatísticas de Redações
    const gradedEssays = essays.filter(e => e.status === 'GRADED' && e.correction)
    const aiGradedEssays = essays.filter(e => e.classroomId === null && e.status === 'GRADED' && e.correction)
    const teacherGradedEssays = essays.filter(e => e.classroomId !== null && e.status === 'GRADED' && e.correction)

    const scoresList = gradedEssays.map(e => e.correction.totalScore)
    const averageScore = scoresList.length > 0
      ? Math.round(scoresList.reduce((acc, curr) => acc + curr, 0) / scoresList.length)
      : 0

    const bestScore = scoresList.length > 0 ? Math.max(...scoresList) : 0

    // Médias por competência (C1 a C5)
    const avgCompetencies = {
      c1: gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, e) => acc + (e.correction.c1Score || 0), 0) / gradedEssays.length) : 0,
      c2: gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, e) => acc + (e.correction.c2Score || 0), 0) / gradedEssays.length) : 0,
      c3: gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, e) => acc + (e.correction.c3Score || 0), 0) / gradedEssays.length) : 0,
      c4: gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, e) => acc + (e.correction.c4Score || 0), 0) / gradedEssays.length) : 0,
      c5: gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, e) => acc + (e.correction.c5Score || 0), 0) / gradedEssays.length) : 0
    }

    // Turmas vinculadas
    const classrooms = user.enrollments.map(e => ({
      id: e.classroom.id,
      name: e.classroom.name,
      code: e.classroom.code,
      teacherName: e.classroom.teacher?.name || 'Professor',
      teacherEmail: e.classroom.teacher?.email,
      membersCount: e.classroom._count?.members || 0
    }))

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt
      },
      stats: {
        questions: {
          total: totalQuestions,
          correct: correctQuestions,
          incorrect: incorrectQuestions,
          accuracyRate
        },
        essays: {
          total: essays.length,
          graded: gradedEssays.length,
          pending: essays.filter(e => e.status === 'PENDING').length,
          aiGraded: aiGradedEssays.length,
          teacherGraded: teacherGradedEssays.length,
          averageScore,
          bestScore,
          avgCompetencies
        },
        lessons: {
          completedCount: lessonProgress.length
        },
        classroomsCount: classrooms.length
      },
      performanceBySubject,
      essays: essays.map(e => ({
        id: e.id,
        theme: e.theme,
        title: e.title,
        content: e.content,
        status: e.status,
        submissionType: e.submissionType,
        isAiCorrection: e.classroomId === null && e.status === 'GRADED',
        classroomName: e.classroom?.name || null,
        teacherName: e.classroom?.teacher?.name || null,
        createdAt: e.createdAt,
        correction: e.correction ? {
          id: e.correction.id,
          totalScore: e.correction.totalScore,
          c1Score: e.correction.c1Score,
          c2Score: e.correction.c2Score,
          c3Score: e.correction.c3Score,
          c4Score: e.correction.c4Score,
          c5Score: e.correction.c5Score,
          generalFeedback: e.correction.generalFeedback || e.correction.generalComment || '',
          positivePoints: e.correction.positivePoints || '',
          improvements: e.correction.improvements || '',
          evaluatorName: e.classroomId === null ? 'Inteligência Artificial' : (e.correction.teacher?.name || 'Professor'),
          createdAt: e.correction.createdAt
        } : null
      })),
      questionAnswers: questionAnswers.map(q => ({
        id: q.id,
        option: q.option,
        isCorrect: q.isCorrect,
        createdAt: q.createdAt,
        question: {
          id: q.question?.id,
          statement: q.question?.statement,
          discipline: q.question?.discipline,
          difficulty: q.question?.difficulty,
          year: q.question?.year,
          subjectName: q.question?.subject?.name || q.question?.discipline || 'Geral',
          subjectColor: q.question?.subject?.color || '#8b5cf6'
        }
      })),
      lessonProgress: lessonProgress.map(lp => ({
        id: lp.id,
        completedAt: lp.createdAt,
        lesson: {
          id: lp.lesson?.id,
          title: lp.lesson?.title,
          duration: lp.lesson?.duration,
          moduleTitle: lp.lesson?.module?.title,
          subjectName: lp.lesson?.module?.subject?.name || 'Geral',
          subjectColor: lp.lesson?.module?.subject?.color || '#8b5cf6'
        }
      })),
      classrooms
    }
  }

  // Se for Professor, retorna dados de turmas e correções lideradas
  const classroomsLed = user.classroomsLed.map(c => ({
    id: c.id,
    name: c.name,
    code: c.code,
    createdAt: c.createdAt,
    membersCount: c._count?.members || 0,
    essaysCount: c._count?.essays || 0
  }))

  const teacherCorrections = await prisma.essayCorrection.findMany({
    where: { teacherId: id },
    select: {
      id: true,
      totalScore: true,
      createdAt: true,
      essay: {
        select: {
          id: true,
          theme: true,
          title: true,
          student: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }).catch(() => [])

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt
    },
    teacherStats: {
      classroomsCount: classroomsLed.length,
      correctionsCount: teacherCorrections.length,
      totalStudentsEnrolled: classroomsLed.reduce((acc, c) => acc + c.membersCount, 0),
      averageScoreGiven: teacherCorrections.length > 0
        ? Math.round(teacherCorrections.reduce((acc, curr) => acc + curr.totalScore, 0) / teacherCorrections.length)
        : 0
    },
    classroomsLed,
    corrections: teacherCorrections.map(tc => ({
      id: tc.id,
      totalScore: tc.totalScore,
      createdAt: tc.createdAt,
      theme: tc.essay?.theme,
      title: tc.essay?.title,
      studentName: tc.essay?.student?.name,
      studentEmail: tc.essay?.student?.email
    }))
  }
})
