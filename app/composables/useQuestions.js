export function useQuestions() {
  const questions = useState('conecta_questions_list', () => [])
  const loading = useState('conecta_questions_loading', () => false)
  const error = useState('conecta_questions_error', () => null)

  async function getQuestions(params = {}, { force = false } = {}) {
    const hasFilters = Boolean(
      params.search ||
      params.subjectId ||
      params.difficulty ||
      params.year ||
      params.status ||
      params.hasImages ||
      params.hasExplanation ||
      params.sort
    )
    if (!hasFilters && !force && Array.isArray(questions.value) && questions.value.length > 0) {
      return questions.value
    }
    loading.value = true
    error.value = null

    try {
      const query = {}
      if (params.search) query.search = params.search
      if (params.subjectId) query.subjectId = params.subjectId
      if (params.difficulty) query.difficulty = params.difficulty
      if (params.year) query.year = params.year
      if (params.status) query.status = params.status
      if (params.hasImages) query.hasImages = params.hasImages
      if (params.hasExplanation) query.hasExplanation = params.hasExplanation
      if (params.sort) query.sort = params.sort
      if (params.limit) query.limit = params.limit
      if (params.page) query.page = params.page

      const response = await $fetch('/api/questions', { query })
      const list = Array.isArray(response)
        ? response
        : (response?.data || response?.questions || [])

      questions.value = list
      return list
    } catch (err) {
      console.error('Erro ao buscar questões:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Erro ao carregar questões.'
      questions.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function getQuestion(id) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/questions/${id}`)
      return response?.data || response?.question || response
    } catch (err) {
      console.error('Erro ao buscar questão:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Erro ao carregar questão.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createQuestion(data) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/questions', {
        method: 'POST',
        body: data
      })
      return response?.data || response?.question || response
    } catch (err) {
      console.error('Erro ao criar questão:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Erro ao criar questão.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateQuestion(id, data) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/questions/${id}`, {
        method: 'PUT',
        body: data
      })
      return response?.data || response?.question || response
    } catch (err) {
      console.error('Erro ao atualizar questão:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Erro ao atualizar questão.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteQuestion(id) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/questions/${id}`, {
        method: 'DELETE'
      })
      return response?.data || response
    } catch (err) {
      console.error('Erro ao excluir questão:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Erro ao excluir questão.'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    questions,
    loading,
    error,
    getQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion
  }
}
