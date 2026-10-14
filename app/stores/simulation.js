import { defineStore } from 'pinia'
import { calculateTriScore } from '#shared/utils/enem-tri'

export const useSimulationStore = defineStore('simulation', {
  state: () => ({
    simulation: null,
    attemptId: null,
    questions: [],
    answers: {},
    currentQuestionIndex: 0,
    startedAt: null,
    finishedAt: null,
    loading: false
  }),

  getters: {
    currentQuestion: (state) => {
      return state.questions[state.currentQuestionIndex] ?? null
    },

    totalQuestions: (state) => {
      return state.questions.length
    },

    answeredQuestions: (state) => {
      return Object.keys(state.answers).length
    },

    progressPercentage() {
      if (this.totalQuestions === 0) {
        return 0
      }

      return Math.round(
        (this.answeredQuestions / this.totalQuestions) * 100
      )
    },

    isFinished: (state) => {
      return !!state.finishedAt
    },

    /**
     * Calcula o resultado com estimativa TRI e coerência pedagógica
     */
    triResult: (state) => {
      if (!state.questions || state.questions.length === 0) {
        return null
      }

      const evaluatedItems = state.questions.map((q) => {
        const selectedOptionId = state.answers[q.id]
        const correctOption = q.options?.find((opt) => opt.isCorrect)
        const isCorrect = correctOption ? selectedOptionId === correctOption.id : false

        return {
          difficulty: q.difficulty,
          isCorrect
        }
      })

      return calculateTriScore(evaluatedItems)
    }
  },

  actions: {
    startSimulation({
      simulation,
      attemptId,
      questions
    }) {
      this.simulation = simulation
      this.attemptId = attemptId
      this.questions = questions || []
      this.answers = {}
      this.currentQuestionIndex = 0
      this.startedAt = new Date().toISOString()
      this.finishedAt = null
    },

    answerQuestion(questionId, optionId) {
      this.answers[questionId] = optionId
    },

    nextQuestion() {
      if (
        this.currentQuestionIndex <
        this.questions.length - 1
      ) {
        this.currentQuestionIndex++
      }
    },

    previousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
      }
    },

    goToQuestion(index) {
      if (
        index >= 0 &&
        index < this.questions.length
      ) {
        this.currentQuestionIndex = index
      }
    },

    finishSimulation() {
      this.finishedAt = new Date().toISOString()
    },

    setLoading(value) {
      this.loading = value
    },

    resetSimulation() {
      this.simulation = null
      this.attemptId = null
      this.questions = []
      this.answers = {}
      this.currentQuestionIndex = 0
      this.startedAt = null
      this.finishedAt = null
      this.loading = false
    }
  }
})