<script setup>
import { useQuestions } from '~/composables/useQuestions'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Banco de Questões — Conecta Enem'
})

const { questions, loading, error, getQuestions } = useQuestions()

const route = useRoute()
const router = useRouter()

const subjects = ref([])
const loadingSubjects = ref(true)

// Filters
const selectedSubjectId = ref('')
const selectedDifficulty = ref('')
const selectedYear = ref('')
const searchQuery = ref('')
const selectedStatusFilter = ref('ALL') // 'ALL', 'UNANSWERED', 'CORRECT', 'INCORRECT'
const selectedHasImages = ref('') // '', 'true', 'false'
const selectedHasExplanation = ref('') // '', 'true', 'false'
const selectedSort = ref('year_desc') // 'year_desc', 'year_asc', 'random', 'difficulty_desc', 'difficulty_asc'
const showAdvancedFilters = ref(false)

// Practice State
const currentIndex = ref(0)
const selectedOption = ref(null) // 'A', 'B', 'C', 'D', 'E'
const sessionAnswers = reactive({}) // { [questionId]: { selected: 'A', correct: true/false, answeredAt: Date } }
const viewMode = ref('PRACTICE') // 'PRACTICE' or 'LIST'

// Fetch questions, subjects & student answer history
async function loadData() {
  await Promise.all([
    getQuestions(),
    loadSubjects(),
    loadAnswers()
  ])
}

async function loadSubjects() {
  loadingSubjects.value = true
  try {
    const res = await $fetch('/api/subjects/active').catch(() => null)
    if (res?.subjects) {
      subjects.value = res.subjects
    } else {
      const fallback = await $fetch('/api/subjects').catch(() => null)
      subjects.value = fallback?.subjects || []
    }
  } catch (err) {
    console.error('Erro ao carregar matérias:', err)
  } finally {
    loadingSubjects.value = false
  }
}

async function loadAnswers() {
  try {
    const res = await $fetch('/api/student/questions/answers').catch(() => null)
    if (res?.answers) {
      Object.assign(sessionAnswers, res.answers)
    }
  } catch (err) {
    console.warn('Erro ao carregar histórico de respostas do banco:', err)
    // Fallback: tenta recuperar do localStorage
    try {
      const saved = localStorage.getItem('conecta_student_answers')
      if (saved) Object.assign(sessionAnswers, JSON.parse(saved))
    } catch {}
  }
}

// Available years extracted from questions
const availableYears = computed(() => {
  const years = new Set()
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.year && q.active !== false) years.add(q.year)
    })
  }
  return Array.from(years).sort((a, b) => b - a)
})

// Métricas de contagem por filtro para os Badges
const totalActiveQuestions = computed(() => {
  if (!Array.isArray(questions.value)) return 0
  return questions.value.filter(q => q.active !== false).length
})

const subjectCounts = computed(() => {
  const map = {}
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.active !== false) {
        const sId = q.subjectId || q.subject?.id
        if (sId) map[sId] = (map[sId] || 0) + 1
      }
    })
  }
  return map
})

const yearCounts = computed(() => {
  const map = {}
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.active !== false && q.year) {
        map[q.year] = (map[q.year] || 0) + 1
      }
    })
  }
  return map
})

const difficultyCounts = computed(() => {
  const map = { EASY: 0, MEDIUM: 0, HARD: 0 }
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.active !== false && q.difficulty) {
        map[q.difficulty] = (map[q.difficulty] || 0) + 1
      }
    })
  }
  return map
})

const hasActiveFilters = computed(() => {
  return Boolean(
    selectedSubjectId.value ||
    selectedDifficulty.value ||
    selectedYear.value ||
    searchQuery.value.trim() ||
    selectedStatusFilter.value !== 'ALL' ||
    selectedHasImages.value ||
    selectedHasExplanation.value ||
    (selectedSort.value && selectedSort.value !== 'year_desc')
  )
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (selectedSubjectId.value) count++
  if (selectedDifficulty.value) count++
  if (selectedYear.value) count++
  if (searchQuery.value.trim()) count++
  if (selectedStatusFilter.value !== 'ALL') count++
  if (selectedHasImages.value) count++
  if (selectedHasExplanation.value) count++
  if (selectedSort.value && selectedSort.value !== 'year_desc') count++
  return count
})

// Algoritmo de Embaralhamento para o modo Simulado
const shuffleSeed = ref(0)
function shuffleArray(arr) {
  const copy = [...arr]
  let seed = shuffleSeed.value || 12345
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280
    const j = Math.floor((seed / 233280) * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Filtered Questions List
// Paginação progressiva para o modo lista
const listDisplayLimit = ref(15)

watch(
  [selectedSubjectId, selectedDifficulty, selectedYear, searchQuery, selectedStatusFilter, selectedHasImages, selectedHasExplanation, selectedSort],
  () => {
    listDisplayLimit.value = 15
    currentIndex.value = 0

    // Sincroniza parâmetros na URL para permitir compartilhamento e salvar estado
    const query = {}
    if (selectedSubjectId.value) query.materia = selectedSubjectId.value
    if (selectedDifficulty.value) query.dificuldade = selectedDifficulty.value
    if (selectedYear.value) query.ano = selectedYear.value
    if (selectedStatusFilter.value !== 'ALL') query.status = selectedStatusFilter.value
    if (searchQuery.value.trim()) query.busca = searchQuery.value.trim()
    if (selectedHasImages.value) query.imagens = selectedHasImages.value
    if (selectedHasExplanation.value) query.explicacao = selectedHasExplanation.value
    if (selectedSort.value && selectedSort.value !== 'year_desc') query.ordem = selectedSort.value

    router.replace({ query }).catch(() => {})
  }
)

const displayedListQuestions = computed(() => {
  return filteredQuestions.value.slice(0, listDisplayLimit.value)
})

const hasMoreListQuestions = computed(() => {
  return listDisplayLimit.value < filteredQuestions.value.length
})

function loadMoreListQuestions() {
  listDisplayLimit.value += 15
}

const difficultyWeights = { EASY: 1, MEDIUM: 2, HARD: 3 }

const filteredQuestions = computed(() => {
  const list = questions.value || []
  if (!Array.isArray(list)) return []

  const result = list.filter((q) => {
    // Apenas questões ativas para alunos
    if (q.active === false) return false

    // Matéria
    if (selectedSubjectId.value) {
      const sId = q.subjectId || q.subject?.id
      if (sId !== selectedSubjectId.value) return false
    }

    // Dificuldade
    if (selectedDifficulty.value && q.difficulty !== selectedDifficulty.value) {
      return false
    }

    // Ano do ENEM
    if (selectedYear.value && q.year !== Number(selectedYear.value)) {
      return false
    }

    // Busca inteligente expandida (enunciado, título e opções)
    if (searchQuery.value.trim()) {
      const term = searchQuery.value.toLowerCase().trim()
      const inStatement = q.statement?.toLowerCase().includes(term)
      const inTitle = q.title?.toLowerCase().includes(term)
      const inOptions = Array.isArray(q.options) && q.options.some(opt => opt.text?.toLowerCase().includes(term))
      if (!inStatement && !inTitle && !inOptions) return false
    }

    // Status no histórico do aluno
    const ans = sessionAnswers[q.id]
    if (selectedStatusFilter.value === 'UNANSWERED' && ans) return false
    if (selectedStatusFilter.value === 'CORRECT' && (!ans || !ans.correct)) return false
    if (selectedStatusFilter.value === 'INCORRECT' && (!ans || ans.correct)) return false

    // Recurso Visual (com ou sem figuras/imagens)
    const hasImg = Boolean(q.imageUrl || (q.images && q.images !== '[]' && q.images !== ''))
    if (selectedHasImages.value === 'true' && !hasImg) return false
    if (selectedHasImages.value === 'false' && hasImg) return false

    // Gabarito Comentado (com ou sem resolução explicada)
    const hasExp = Boolean(q.explanation && q.explanation.trim())
    if (selectedHasExplanation.value === 'true' && !hasExp) return false
    if (selectedHasExplanation.value === 'false' && hasExp) return false

    return true
  })

  // Ordenação inteligente
  if (selectedSort.value === 'random') {
    return shuffleArray(result)
  }

  return result.sort((a, b) => {
    if (selectedSort.value === 'year_asc') {
      return (a.year || 0) - (b.year || 0) || new Date(b.createdAt) - new Date(a.createdAt)
    }
    if (selectedSort.value === 'difficulty_desc') {
      const diffA = difficultyWeights[a.difficulty] || 0
      const diffB = difficultyWeights[b.difficulty] || 0
      return diffB - diffA || (b.year || 0) - (a.year || 0)
    }
    if (selectedSort.value === 'difficulty_asc') {
      const diffA = difficultyWeights[a.difficulty] || 0
      const diffB = difficultyWeights[b.difficulty] || 0
      return diffA - diffB || (b.year || 0) - (a.year || 0)
    }
    // Padrão: ano decrescente + criação
    return (b.year || 0) - (a.year || 0) || new Date(b.createdAt) - new Date(a.createdAt)
  })
})

// Current active question in practice mode
const currentQuestion = computed(() => {
  if (filteredQuestions.value.length === 0) return null
  const idx = Math.min(currentIndex.value, filteredQuestions.value.length - 1)
  return filteredQuestions.value[idx] || null
})

// Current question answer state
const currentQuestionAnswer = computed(() => {
  if (!currentQuestion.value) return null
  return sessionAnswers[currentQuestion.value.id] || null
})

// Session Stats
const totalAnswered = computed(() => Object.keys(sessionAnswers).length)
const totalCorrect = computed(() => Object.values(sessionAnswers).filter(a => a.correct).length)
const totalIncorrect = computed(() => Object.values(sessionAnswers).filter(a => !a.correct).length)
const accuracyRate = computed(() => {
  if (totalAnswered.value === 0) return 0
  return Math.round((totalCorrect.value / totalAnswered.value) * 100)
})

// Images support
const studentActiveImageIndex = ref(0)

function getQuestionImages(q) {
  if (!q) return []
  let list = []
  if (q.images) {
    try {
      const parsed = typeof q.images === 'string' ? JSON.parse(q.images) : q.images
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed
          .map((item, idx) => {
            if (typeof item === 'string') return { url: item, title: `Imagem ${idx + 1}` }
            if (item && item.url) return { url: item.url, title: item.title || `Imagem ${idx + 1}` }
            return null
          })
          .filter(Boolean)
      }
    } catch {}
  }
  if (list.length === 0 && q.imageUrl) {
    list = [{ url: q.imageUrl, title: 'Imagem 1' }]
  }
  return list
}

// Watch current question changes to reset selected option
watch(
  () => currentQuestion.value?.id,
  (newId) => {
    studentActiveImageIndex.value = 0
    if (newId && sessionAnswers[newId]) {
      selectedOption.value = sessionAnswers[newId].selected
    } else {
      selectedOption.value = null
    }
  },
  { immediate: true }
)

function selectOption(letter) {
  if (currentQuestionAnswer.value) return // already answered
  selectedOption.value = letter
}

function saveAnswersToLocalStorage() {
  try {
    localStorage.setItem('conecta_student_answers', JSON.stringify(sessionAnswers))
  } catch {}
}

async function submitAnswer() {
  if (!currentQuestion.value || !selectedOption.value || currentQuestionAnswer.value) return

  const q = currentQuestion.value
  const option = selectedOption.value
  const isCorrect = String(option).toUpperCase() === String(q.correctAnswer).toUpperCase()

  // Atualização imediata no frontend
  sessionAnswers[q.id] = {
    selected: option,
    correct: isCorrect,
    answeredAt: new Date()
  }
  saveAnswersToLocalStorage()

  // Persistência no banco de dados
  try {
    await $fetch('/api/student/questions/answer', {
      method: 'POST',
      body: {
        questionId: q.id,
        option
      }
    })
  } catch (err) {
    console.error('Erro ao salvar resposta no banco de dados:', err)
  }
}

async function resetCurrentQuestion() {
  if (!currentQuestion.value) return
  const qId = currentQuestion.value.id
  delete sessionAnswers[qId]
  selectedOption.value = null
  saveAnswersToLocalStorage()

  try {
    await $fetch('/api/student/questions/reset', {
      method: 'POST',
      body: {
        questionId: qId
      }
    })
  } catch (err) {
    console.error('Erro ao resetar questão no banco:', err)
  }
}

function nextQuestion() {
  if (currentIndex.value < filteredQuestions.value.length - 1) {
    currentIndex.value++
  }
}

function formatStatement(stmt) {
  if (!stmt) return ''
  let html = stmt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Converte imagens inline do Markdown: ![alt](url) ou ![](url) em tags <img> reais
  html = html.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (match, alt, url) => {
    return `<img src="${url}" alt="${alt || 'Figura da questão'}" class="inline-block max-h-60 max-w-full my-2.5 rounded-xl border border-[var(--student-border)] bg-white dark:bg-zinc-900 p-1.5 shadow-2xs object-contain" />`
  })

  // Transforma **TEXTO I**, **TEXTO 1**, Texto 1 ou TEXTO I em badges de destaque
  html = html.replace(/(?:^|\n+)(?:\*{0,2}(TEXTO\s+[IVXLCDM\d]+[^\*\n]*)\*{0,2})/gi, (match, p1) => {
    return `<div class="mt-3 mb-1.5"><span class="inline-flex items-center gap-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-2xs">${p1.trim()}</span></div>`
  })

  // Transforma **bold**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')

  // Transforma _itálico_
  html = html.replace(/_([^_]+)_/g, '<span class="italic text-xs opacity-75 block mt-1">$1</span>')

  return html
}

function prevQuestion() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function jumpToQuestion(index) {
  if (index >= 0 && index < filteredQuestions.value.length) {
    currentIndex.value = index
  }
}

function clearFilters() {
  selectedSubjectId.value = ''
  selectedDifficulty.value = ''
  selectedYear.value = ''
  searchQuery.value = ''
  selectedStatusFilter.value = 'ALL'
  selectedHasImages.value = ''
  selectedHasExplanation.value = ''
  selectedSort.value = 'year_desc'
  currentIndex.value = 0
}

function removeSingleFilter(key) {
  if (key === 'subject') selectedSubjectId.value = ''
  else if (key === 'difficulty') selectedDifficulty.value = ''
  else if (key === 'year') selectedYear.value = ''
  else if (key === 'search') searchQuery.value = ''
  else if (key === 'status') selectedStatusFilter.value = 'ALL'
  else if (key === 'images') selectedHasImages.value = ''
  else if (key === 'explanation') selectedHasExplanation.value = ''
  else if (key === 'sort') selectedSort.value = 'year_desc'
  currentIndex.value = 0
}

function applyPreset(preset) {
  currentIndex.value = 0
  if (preset === 'INCORRECT') {
    selectedStatusFilter.value = selectedStatusFilter.value === 'INCORRECT' ? 'ALL' : 'INCORRECT'
  } else if (preset === 'UNANSWERED') {
    selectedStatusFilter.value = selectedStatusFilter.value === 'UNANSWERED' ? 'ALL' : 'UNANSWERED'
  } else if (preset === 'HARD') {
    selectedDifficulty.value = selectedDifficulty.value === 'HARD' ? '' : 'HARD'
  } else if (preset === 'IMAGES') {
    selectedHasImages.value = selectedHasImages.value === 'true' ? '' : 'true'
  } else if (preset === 'RANDOM') {
    if (selectedSort.value === 'random') {
      selectedSort.value = 'year_desc'
    } else {
      shuffleSeed.value = Date.now()
      selectedSort.value = 'random'
    }
  }
}

function getSubjectName(id) {
  const sub = subjects.value.find(s => s.id === id)
  return sub?.name || id
}

function resetStats() {
  for (const key in sessionAnswers) {
    delete sessionAnswers[key]
  }
  selectedOption.value = null
  saveAnswersToLocalStorage()
}

const difficultyLabels = {
  EASY: { label: 'Fácil', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  MEDIUM: { label: 'Média', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  HARD: { label: 'Difícil', class: 'bg-red-500/10 text-red-600 border-red-500/20' }
}

onMounted(() => {
  if (route.query.materia) selectedSubjectId.value = String(route.query.materia)
  if (route.query.dificuldade) selectedDifficulty.value = String(route.query.dificuldade)
  if (route.query.ano) selectedYear.value = String(route.query.ano)
  if (route.query.status) selectedStatusFilter.value = String(route.query.status)
  if (route.query.busca) searchQuery.value = String(route.query.busca)
  if (route.query.imagens) selectedHasImages.value = String(route.query.imagens)
  if (route.query.explicacao) selectedHasExplanation.value = String(route.query.explicacao)
  if (route.query.ordem) selectedSort.value = String(route.query.ordem)

  loadData()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
    <!-- HEADER -->
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full bg-[var(--student-primary-soft)] px-3 py-1 text-xs font-black text-[var(--student-primary-text)]">
          <Icon name="material-symbols:quiz-rounded" class="text-base" />
          <span>Banco de Questões ENEM</span>
        </div>
        <h1 class="mt-2 text-2xl font-black tracking-tight text-[var(--student-text)] sm:text-3xl lg:text-4xl">
          Treino de Questões
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-[var(--student-text-secondary)] sm:text-base">
          Pratique com questões oficiais do ENEM, veja a resolução comentada e acompanhe sua taxa de acertos.
        </p>
      </div>

      <!-- MODO DE VISUALIZAÇÃO -->
      <div class="flex items-center gap-2 self-start lg:self-auto">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition"
          :class="
            viewMode === 'PRACTICE'
              ? 'bg-[var(--student-primary-solid)] text-white shadow-md shadow-purple-900/10'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:bg-[var(--student-surface)]'
          "
          @click="viewMode = 'PRACTICE'"
        >
          <Icon name="material-symbols:smart-display-rounded" class="text-base" />
          <span>Modo Prática</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition"
          :class="
            viewMode === 'LIST'
              ? 'bg-[var(--student-primary-solid)] text-white shadow-md shadow-purple-900/10'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:bg-[var(--student-surface)]'
          "
          @click="viewMode = 'LIST'"
        >
          <Icon name="material-symbols:format-list-bulleted-rounded" class="text-base" />
          <span>Modo Lista</span>
        </button>
      </div>
    </section>

    <!-- STATS BAR -->
    <section class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="student-card rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[var(--student-text-secondary)]">Respondidas</p>
          <Icon name="material-symbols:task-alt-rounded" class="text-purple-600 text-lg" />
        </div>
        <p class="mt-1 text-2xl font-black text-[var(--student-text)]">{{ totalAnswered }}</p>
      </div>

      <div class="student-card rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-emerald-600">Acertos</p>
          <Icon name="material-symbols:check-circle-rounded" class="text-emerald-500 text-lg" />
        </div>
        <p class="mt-1 text-2xl font-black text-emerald-600">{{ totalCorrect }}</p>
      </div>

      <div class="student-card rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-red-500">Erros</p>
          <Icon name="material-symbols:cancel-rounded" class="text-red-500 text-lg" />
        </div>
        <p class="mt-1 text-2xl font-black text-red-500">{{ totalIncorrect }}</p>
      </div>

      <div class="student-card rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-[var(--student-primary-text)]">Taxa de Acerto</p>
          <span class="text-xs font-black text-[var(--student-primary-text)]">{{ accuracyRate }}%</span>
        </div>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--student-surface)]">
          <div
            class="h-full rounded-full bg-[var(--student-primary-solid)] transition-all duration-500"
            :style="{ width: `${accuracyRate}%` }"
          ></div>
        </div>
      </div>
    </section>

    <!-- FILTROS POR MATÉRIA (TABS/CHIPS COM CONTADORES) -->
    <section class="mt-8">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          class="inline-flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          :class="
            selectedSubjectId === ''
              ? 'bg-[var(--student-primary-solid)] text-white shadow-sm'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:border-purple-400 hover:text-[var(--student-text)]'
          "
          @click="selectedSubjectId = ''; currentIndex = 0"
        >
          <span>Todas as matérias</span>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-black"
            :class="selectedSubjectId === '' ? 'bg-white/20 text-white' : 'bg-[var(--student-surface)] text-[var(--student-text-muted)]'"
          >
            {{ totalActiveQuestions }}
          </span>
        </button>

        <button
          v-for="sub in subjects"
          :key="sub.id"
          type="button"
          class="inline-flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          :class="
            selectedSubjectId === sub.id
              ? 'bg-[var(--student-primary-solid)] text-white shadow-sm'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:border-purple-400 hover:text-[var(--student-text)]'
          "
          @click="selectedSubjectId = sub.id; currentIndex = 0"
        >
          <span>{{ sub.name }}</span>
          <span
            v-if="subjectCounts[sub.id]"
            class="rounded-full px-2 py-0.5 text-[10px] font-black"
            :class="selectedSubjectId === sub.id ? 'bg-white/20 text-white' : 'bg-[var(--student-surface)] text-[var(--student-text-muted)]'"
          >
            {{ subjectCounts[sub.id] }}
          </span>
        </button>
      </div>
    </section>

    <!-- BARRA DE ATALHOS RÁPIDOS (1 CLIQUE) -->
    <section class="mt-3 flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold text-[var(--student-text-secondary)] flex items-center gap-1.5 mr-1">
        <Icon name="material-symbols:bolt-rounded" class="text-amber-500 text-sm" />
        Treino Rápido:
      </span>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer"
        :class="selectedStatusFilter === 'INCORRECT'
          ? 'bg-red-500 text-white border-red-500 shadow-xs'
          : 'border-[var(--student-border)] bg-[var(--student-card)] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'"
        @click="applyPreset('INCORRECT')"
      >
        <Icon name="material-symbols:cancel-rounded" class="text-sm" />
        <span>Refazer Erros ({{ totalIncorrect }})</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer"
        :class="selectedStatusFilter === 'UNANSWERED'
          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
          : 'border-[var(--student-border)] bg-[var(--student-card)] text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30'"
        @click="applyPreset('UNANSWERED')"
      >
        <Icon name="material-symbols:auto-awesome-rounded" class="text-sm" />
        <span>Questões Inéditas</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer"
        :class="selectedDifficulty === 'HARD'
          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
          : 'border-[var(--student-border)] bg-[var(--student-card)] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'"
        @click="applyPreset('HARD')"
      >
        <Icon name="material-symbols:local-fire-department-rounded" class="text-sm" />
        <span>Desafio Difícil</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer"
        :class="selectedHasImages === 'true'
          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
          : 'border-[var(--student-border)] bg-[var(--student-card)] text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30'"
        @click="applyPreset('IMAGES')"
      >
        <Icon name="material-symbols:image-rounded" class="text-sm" />
        <span>Com Imagens</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer"
        :class="selectedSort === 'random'
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
          : 'border-[var(--student-border)] bg-[var(--student-card)] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'"
        @click="applyPreset('RANDOM')"
      >
        <Icon name="material-symbols:shuffle-rounded" class="text-sm" />
        <span>Modo Simulado</span>
      </button>
    </section>

    <!-- BARRA DE FILTROS PRINCIPAL -->
    <section class="mt-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-4 shadow-xs">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)_auto]">
        <!-- BUSCA INTELIGENTE EXPANDIDA -->
        <div class="relative">
          <Icon
            name="material-symbols:search-rounded"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--student-text-muted)]"
          />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar no enunciado, título ou alternativas..."
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] pl-9 pr-8 text-xs text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @input="currentIndex = 0"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--student-text-muted)] hover:text-red-500 p-1"
            title="Limpar busca"
            @click="searchQuery = ''; currentIndex = 0"
          >
            ✕
          </button>
        </div>

        <!-- DIFICULDADE -->
        <select
          v-model="selectedDifficulty"
          class="h-10 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
          @change="currentIndex = 0"
        >
          <option value="">Todas as dificuldades</option>
          <option value="EASY">Fácil ({{ difficultyCounts.EASY }})</option>
          <option value="MEDIUM">Média ({{ difficultyCounts.MEDIUM }})</option>
          <option value="HARD">Difícil ({{ difficultyCounts.HARD }})</option>
        </select>

        <!-- ANO ENEM -->
        <select
          v-model="selectedYear"
          class="h-10 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
          @change="currentIndex = 0"
        >
          <option value="">Todos os anos</option>
          <option
            v-for="year in availableYears"
            :key="year"
            :value="year"
          >
            ENEM {{ year }} ({{ yearCounts[year] || 0 }})
          </option>
        </select>

        <!-- STATUS -->
        <select
          v-model="selectedStatusFilter"
          class="h-10 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
          @change="currentIndex = 0"
        >
          <option value="ALL">Todas as questões</option>
          <option value="UNANSWERED">Não respondidas (Inéditas)</option>
          <option value="CORRECT">Acertadas</option>
          <option value="INCORRECT">Erradas (Refazer)</option>
        </select>

        <!-- BOTÕES: MAIS FILTROS & LIMPAR -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--student-border)] px-3 text-xs font-bold transition hover:border-purple-500 hover:text-purple-600"
            :class="showAdvancedFilters ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-600 dark:text-purple-300' : 'text-[var(--student-text-secondary)]'"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            <Icon name="material-symbols:tune-rounded" class="text-base" />
            <span class="hidden sm:inline">Mais</span>
            <Icon
              name="material-symbols:keyboard-arrow-down-rounded"
              class="text-base transition-transform duration-200"
              :class="showAdvancedFilters ? 'rotate-180' : ''"
            />
          </button>

          <button
            v-if="hasActiveFilters"
            type="button"
            title="Limpar todos os filtros"
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/40 px-3 text-xs font-bold text-red-600 dark:text-red-400 transition hover:bg-red-100"
            @click="clearFilters"
          >
            <Icon name="material-symbols:filter-alt-off-rounded" class="text-sm" />
            <span class="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </div>

      <!-- PAINEL DE FILTROS AVANÇADOS (EXPANSÍVEL) -->
      <div
        v-if="showAdvancedFilters"
        class="mt-3.5 grid gap-3 border-t border-[var(--student-border)] pt-3.5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <!-- RECURSO VISUAL -->
        <div>
          <label class="mb-1 block text-xs font-bold text-[var(--student-text-secondary)]">Recurso Visual</label>
          <select
            v-model="selectedHasImages"
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @change="currentIndex = 0"
          >
            <option value="">Todas (com e sem imagens)</option>
            <option value="true">Apenas com figuras, gráficos ou tabelas</option>
            <option value="false">Apenas texto puro</option>
          </select>
        </div>

        <!-- RESOLUÇÃO COMENTADA -->
        <div>
          <label class="mb-1 block text-xs font-bold text-[var(--student-text-secondary)]">Gabarito Comentado</label>
          <select
            v-model="selectedHasExplanation"
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @change="currentIndex = 0"
          >
            <option value="">Todas as questões</option>
            <option value="true">Apenas com resolução passo a passo</option>
          </select>
        </div>

        <!-- ORDENAÇÃO -->
        <div>
          <label class="mb-1 block text-xs font-bold text-[var(--student-text-secondary)]">Ordenação</label>
          <select
            v-model="selectedSort"
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @change="currentIndex = 0"
          >
            <option value="year_desc">ENEM Mais recente primeiro</option>
            <option value="year_asc">ENEM Mais antigo primeiro</option>
            <option value="difficulty_desc">Dificuldade (Difícil → Fácil)</option>
            <option value="difficulty_asc">Dificuldade (Fácil → Difícil)</option>
            <option value="random">Ordem Aleatória (Simulado)</option>
          </select>
        </div>
      </div>

      <!-- BARRA DE FILTROS ATIVOS COM REMOÇÃO INDIVIDUAL & CONTADOR -->
      <div class="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--student-border)] pt-3 text-xs">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-bold text-[var(--student-text-secondary)]">Filtros:</span>

          <span
            v-if="selectedSubjectId"
            class="inline-flex items-center gap-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          >
            {{ getSubjectName(selectedSubjectId) }}
            <button type="button" @click="removeSingleFilter('subject')" class="hover:text-purple-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedYear"
            class="inline-flex items-center gap-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          >
            ENEM {{ selectedYear }}
            <button type="button" @click="removeSingleFilter('year')" class="hover:text-blue-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedDifficulty"
            class="inline-flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          >
            {{ selectedDifficulty === 'EASY' ? 'Fácil' : selectedDifficulty === 'MEDIUM' ? 'Média' : 'Difícil' }}
            <button type="button" @click="removeSingleFilter('difficulty')" class="hover:text-amber-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedStatusFilter !== 'ALL'"
            class="inline-flex items-center gap-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
          >
            {{ selectedStatusFilter === 'UNANSWERED' ? 'Inéditas' : selectedStatusFilter === 'CORRECT' ? 'Acertadas' : 'Erradas' }}
            <button type="button" @click="removeSingleFilter('status')" class="hover:text-zinc-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedHasImages"
            class="inline-flex items-center gap-1 rounded-lg bg-sky-100 dark:bg-sky-950/60 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
          >
            {{ selectedHasImages === 'true' ? 'Com Imagens' : 'Texto Puro' }}
            <button type="button" @click="removeSingleFilter('images')" class="hover:text-sky-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedHasExplanation"
            class="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          >
            Com Resolução
            <button type="button" @click="removeSingleFilter('explanation')" class="hover:text-emerald-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="searchQuery.trim()"
            class="inline-flex items-center gap-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          >
            Busca: "{{ searchQuery }}"
            <button type="button" @click="removeSingleFilter('search')" class="hover:text-purple-900 ml-0.5">✕</button>
          </span>

          <span
            v-if="selectedSort && selectedSort !== 'year_desc'"
            class="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          >
            {{ selectedSort === 'random' ? 'Modo Simulado' : selectedSort === 'year_asc' ? 'Mais Antigas' : selectedSort === 'difficulty_desc' ? 'Mais Difíceis' : 'Mais Fáceis' }}
            <button type="button" @click="removeSingleFilter('sort')" class="hover:text-emerald-900 ml-0.5">✕</button>
          </span>

          <span v-if="!hasActiveFilters" class="text-[var(--student-text-muted)] italic">
            Nenhum filtro aplicado (exibindo todas as questões)
          </span>
        </div>

        <!-- CONTADOR DE QUESTÕES ENCONTRADAS -->
        <div class="font-bold text-[var(--student-text-secondary)]">
          Mostrando <strong class="text-purple-600 dark:text-purple-400">{{ filteredQuestions.length }}</strong> de {{ totalActiveQuestions }} questões
        </div>
      </div>
    </section>

    <!-- LOADING STATE -->
    <div
      v-if="loading"
      class="mt-8 flex flex-col items-center justify-center rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-16 text-center"
    >
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
      <p class="mt-4 text-sm font-bold text-[var(--student-text)]">Carregando banco de questões...</p>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else-if="filteredQuestions.length === 0"
      class="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--student-border)] bg-[var(--student-card)] p-12 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)]">
        <Icon name="material-symbols:search-off-rounded" class="text-3xl" />
      </div>
      <h3 class="mt-4 text-lg font-bold text-[var(--student-text)]">
        Nenhuma questão encontrada
      </h3>
      <p class="mt-1 max-w-md text-sm text-[var(--student-text-secondary)]">
        Tente ajustar seus filtros de matéria, dificuldade ou ano para encontrar outras questões.
      </p>
      <button
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--student-primary-solid)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        @click="clearFilters"
      >
        <Icon name="material-symbols:refresh-rounded" class="text-base" />
        <span>Limpar todos os filtros</span>
      </button>
    </div>

    <!-- ==========================================
         MODO PRÁTICA (SOLVER INDIVIDUAL)
    =========================================== -->
    <div
      v-else-if="viewMode === 'PRACTICE' && currentQuestion"
      class="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"
    >
      <!-- CARD PRINCIPAL DA QUESTÃO -->
      <section class="student-card rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 shadow-sm sm:p-8">
        <!-- TOP INFO -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--student-border)] pb-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-xl bg-[var(--student-primary-soft)] px-3 py-1 text-xs font-black text-[var(--student-primary-text)]">
              {{ currentQuestion.subject?.name || "ENEM" }}
            </span>

            <span
              v-if="difficultyLabels[currentQuestion.difficulty]"
              class="rounded-xl border px-3 py-1 text-xs font-bold"
              :class="difficultyLabels[currentQuestion.difficulty].class"
            >
              {{ difficultyLabels[currentQuestion.difficulty].label }}
            </span>

            <span
              v-if="currentQuestion.year"
              class="rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 py-1 text-xs font-semibold text-[var(--student-text-secondary)]"
            >
              ENEM {{ currentQuestion.year }}
            </span>
          </div>

          <div class="text-xs font-bold text-[var(--student-text-muted)]">
            Questão <strong class="text-[var(--student-text)]">{{ currentIndex + 1 }}</strong> de {{ filteredQuestions.length }}
          </div>
        </div>

        <!-- TÍTULO -->
        <h2
          v-if="currentQuestion.title"
          class="mt-5 text-lg font-bold text-[var(--student-text)]"
        >
          {{ currentQuestion.title }}
        </h2>

        <!-- ENUNCIADO -->
        <div
          class="mt-4 text-sm leading-7 sm:text-base text-[var(--student-text)] whitespace-pre-line"
          v-html="formatStatement(currentQuestion.statement)"
        ></div>

        <!-- IMAGENS DA QUESTÃO -->
        <div
          v-if="getQuestionImages(currentQuestion).length > 0"
          class="mt-6 space-y-3"
        >
          <!-- IMAGEM EM DESTAQUE COM TÍTULO -->
          <div class="rounded-2xl border border-[var(--student-border)] bg-[var(--student-card-muted,#f8fafc)] p-4 text-center space-y-2">
            <div class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--student-primary-soft)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--student-primary-text)]">
              <Icon name="material-symbols:image-rounded" class="text-sm" />
              <span>{{ (getQuestionImages(currentQuestion)[studentActiveImageIndex] || getQuestionImages(currentQuestion)[0])?.title }}</span>
            </div>
            <div>
              <img
                :src="(getQuestionImages(currentQuestion)[studentActiveImageIndex] || getQuestionImages(currentQuestion)[0])?.url"
                :alt="(getQuestionImages(currentQuestion)[studentActiveImageIndex] || getQuestionImages(currentQuestion)[0])?.title"
                class="max-h-96 mx-auto rounded-xl object-contain shadow-xs"
              />
            </div>
          </div>

          <!-- SELETOR DE IMAGENS QUANDO MAIS DE UMA -->
          <div
            v-if="getQuestionImages(currentQuestion).length > 1"
            class="flex items-center justify-center gap-2 overflow-x-auto py-1"
          >
            <button
              v-for="(img, idx) in getQuestionImages(currentQuestion)"
              :key="idx"
              type="button"
              class="relative flex flex-col items-center shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer p-1 bg-[var(--student-surface)]"
              :class="studentActiveImageIndex === idx
                ? 'border-[var(--student-primary-solid)] ring-2 ring-[var(--student-primary-solid)]/30'
                : 'border-[var(--student-border)] opacity-70 hover:opacity-100'"
              @click="studentActiveImageIndex = idx"
            >
              <img
                :src="img.url"
                :alt="img.title"
                class="h-12 w-16 object-contain bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5"
              />
              <span class="mt-1 text-[10px] font-bold text-[var(--student-text-secondary)] truncate max-w-[70px]">
                {{ img.title || (idx + 1) }}
              </span>
            </button>
          </div>
        </div>

        <!-- ALTERNATIVAS -->
        <div class="mt-8 space-y-3.5">
          <button
            v-for="option in (currentQuestion.options || [])"
            :key="option.letter"
            type="button"
            class="w-full flex items-start gap-4 rounded-2xl border p-4 text-left transition"
            :class="[
              // Answered correct state
              currentQuestionAnswer && option.letter === currentQuestion.correctAnswer
                ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                : '',
              // Answered wrong state
              currentQuestionAnswer && !currentQuestionAnswer.correct && option.letter === currentQuestionAnswer.selected
                ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20 text-red-950 dark:text-red-200'
                : '',
              // Not answered, selected state
              !currentQuestionAnswer && selectedOption === option.letter
                ? 'border-[var(--student-primary-solid)] bg-[var(--student-primary-soft)] ring-2 ring-[var(--student-primary-solid)]/20'
                : '',
              // Default unselected state
              !currentQuestionAnswer && selectedOption !== option.letter
                ? 'border-[var(--student-border)] bg-[var(--student-surface)]/60 hover:bg-[var(--student-surface)] hover:border-purple-300'
                : '',
              currentQuestionAnswer ? 'cursor-default' : 'cursor-pointer'
            ]"
            @click="selectOption(option.letter)"
          >
            <!-- LETTER BADGE -->
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm transition"
              :class="[
                currentQuestionAnswer && option.letter === currentQuestion.correctAnswer
                  ? 'bg-emerald-600 text-white'
                  : '',
                currentQuestionAnswer && !currentQuestionAnswer.correct && option.letter === currentQuestionAnswer.selected
                  ? 'bg-red-600 text-white'
                  : '',
                !currentQuestionAnswer && selectedOption === option.letter
                  ? 'bg-[var(--student-primary-solid)] text-white'
                  : '',
                !currentQuestionAnswer && selectedOption !== option.letter
                  ? 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text)]'
                  : ''
              ]"
            >
              {{ option.letter }}
            </span>

            <!-- OPTION CONTENT: TEXTO E/OU FOTO -->
            <div class="flex-1 pt-1 text-sm font-medium leading-relaxed text-[var(--student-text)] space-y-2">
              <div v-if="option.text">
                {{ option.text }}
              </div>
              <div v-if="option.imageUrl" class="pt-0.5">
                <img
                  :src="option.imageUrl"
                  alt="Imagem da alternativa"
                  class="max-h-56 rounded-xl border border-[var(--student-border)] bg-white dark:bg-zinc-900 p-1.5 object-contain shadow-xs"
                />
              </div>
              <div v-if="!option.text && !option.imageUrl" class="text-xs text-[var(--student-text-muted)] italic">
                (Opção sem descrição)
              </div>
            </div>

            <!-- RESULT ICON -->
            <div v-if="currentQuestionAnswer" class="pt-1 shrink-0">
              <Icon
                v-if="option.letter === currentQuestion.correctAnswer"
                name="material-symbols:check-circle-rounded"
                class="text-emerald-500 text-xl"
              />
              <Icon
                v-else-if="option.letter === currentQuestionAnswer.selected"
                name="material-symbols:cancel-rounded"
                class="text-red-500 text-xl"
              />
            </div>
          </button>
        </div>

        <!-- ACTIONS & CONFIRM BUTTON -->
        <div class="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-t border-[var(--student-border)] pt-6">
          <div class="flex items-center justify-between sm:justify-start gap-2">
            <button
              type="button"
              :disabled="currentIndex === 0"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 min-h-[44px] rounded-xl border border-[var(--student-border)] px-4 py-2.5 text-xs font-bold text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface)] disabled:opacity-40 active:scale-98 cursor-pointer"
              @click="prevQuestion"
            >
              <Icon name="material-symbols:arrow-back-rounded" class="text-base" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              :disabled="currentIndex >= filteredQuestions.length - 1"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 min-h-[44px] rounded-xl border border-[var(--student-border)] px-4 py-2.5 text-xs font-bold text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface)] disabled:opacity-40 active:scale-98 cursor-pointer"
              @click="nextQuestion"
            >
              <span>Próxima</span>
              <Icon name="material-symbols:arrow-forward-rounded" class="text-base" />
            </button>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="currentQuestionAnswer"
              type="button"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-1 min-h-[44px] rounded-xl border border-[var(--student-border)] px-5 py-2.5 text-xs font-bold text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface)] active:scale-98 cursor-pointer"
              @click="resetCurrentQuestion"
            >
              <Icon name="material-symbols:refresh-rounded" class="text-base" />
              <span>Refazer questão</span>
            </button>

            <button
              v-if="!currentQuestionAnswer"
              type="button"
              :disabled="!selectedOption"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[var(--student-primary-solid)] px-6 py-3 text-sm font-black text-white shadow-lg shadow-purple-900/15 transition hover:opacity-95 disabled:opacity-40 active:scale-98 cursor-pointer"
              @click="submitAnswer"
            >
              <span>Confirmar resposta</span>
              <Icon name="material-symbols:check-rounded" class="text-lg" />
            </button>
          </div>
        </div>

        <!-- RESOLUÇÃO COMENTADA -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div
            v-if="currentQuestionAnswer && currentQuestion.explanation"
            class="mt-6 rounded-2xl border border-[var(--student-primary-solid)]/30 bg-[var(--student-primary-soft)] p-6"
          >
            <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--student-primary-text)]">
              <Icon name="material-symbols:lightbulb-rounded" class="text-lg" />
              <span>Resolução Comentada</span>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-[var(--student-text)] whitespace-pre-line">
              {{ currentQuestion.explanation }}
            </p>
          </div>
        </Transition>
      </section>

      <!-- SIDEBAR DO MAPA DE QUESTÕES -->
      <aside class="space-y-6">
        <div class="student-card rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-[var(--student-border)] pb-3">
            <h3 class="text-sm font-black text-[var(--student-text)]">
              Navegação
            </h3>
            <span class="text-xs text-[var(--student-text-muted)] font-semibold">
              {{ totalAnswered }}/{{ filteredQuestions.length }} feitas
            </span>
          </div>

          <!-- GRID DE BOTÕES DE QUESTÃO -->
          <div class="mt-4 grid grid-cols-5 gap-2">
            <button
              v-for="(q, idx) in filteredQuestions"
              :key="q.id"
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition"
              :class="[
                // Current selected
                currentIndex === idx
                  ? 'ring-2 ring-[var(--student-primary-solid)] ring-offset-2 font-black scale-105'
                  : '',
                // Answered correct
                sessionAnswers[q.id]?.correct
                  ? 'bg-emerald-500 text-white'
                  : '',
                // Answered wrong
                sessionAnswers[q.id] && !sessionAnswers[q.id]?.correct
                  ? 'bg-red-500 text-white'
                  : '',
                // Unanswered
                !sessionAnswers[q.id]
                  ? 'border border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-text-secondary)] hover:border-purple-400'
                  : ''
              ]"
              @click="jumpToQuestion(idx)"
            >
              {{ idx + 1 }}
            </button>
          </div>

          <!-- LEGENDA -->
          <div class="mt-5 space-y-2 border-t border-[var(--student-border)] pt-4 text-xs font-semibold text-[var(--student-text-secondary)]">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span>Acertou</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full bg-red-500"></span>
              <span>Errou</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full border border-[var(--student-border)] bg-[var(--student-surface)]"></span>
              <span>Não respondida</span>
            </div>
          </div>

          <!-- RESET BUTTON -->
          <button
            v-if="totalAnswered > 0"
            type="button"
            class="mt-5 w-full rounded-xl border border-[var(--student-border)] py-2 text-xs font-bold text-[var(--student-text-muted)] hover:text-red-500 hover:border-red-300 transition"
            @click="resetStats"
          >
            Limpar progresso da sessão
          </button>
        </div>
      </aside>
    </div>

    <!-- ==========================================
         MODO LISTA (TODAS AS QUESTÕES)
    =========================================== -->
    <div
      v-else-if="viewMode === 'LIST'"
      class="mt-8 space-y-6"
    >
      <div
        v-for="(q, idx) in displayedListQuestions"
        :key="q.id"
        class="student-card rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 shadow-xs"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--student-border)] pb-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-lg bg-[var(--student-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--student-primary-text)]">
              {{ q.subject?.name || "ENEM" }}
            </span>
            <span
              v-if="difficultyLabels[q.difficulty]"
              class="rounded-lg border px-2.5 py-1 text-xs font-bold"
              :class="difficultyLabels[q.difficulty].class"
            >
              {{ difficultyLabels[q.difficulty].label }}
            </span>
            <span
              v-if="q.year"
              class="rounded-lg border border-[var(--student-border)] bg-[var(--student-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--student-text-secondary)]"
            >
              ENEM {{ q.year }}
            </span>
          </div>

          <div class="text-xs font-bold text-[var(--student-text-muted)]">
            #{{ idx + 1 }}
          </div>
        </div>

        <div
          class="mt-4 text-sm sm:text-base leading-relaxed text-[var(--student-text)] whitespace-pre-line"
          v-html="formatStatement(q.statement)"
        ></div>

        <div v-if="getQuestionImages(q).length > 0" class="mt-4">
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(img, imgIdx) in getQuestionImages(q)"
              :key="imgIdx"
              class="relative overflow-hidden rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] p-2 space-y-1.5"
            >
              <div v-if="img.title" class="inline-flex items-center gap-1 rounded-md bg-[var(--student-primary-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--student-primary-text)]">
                <Icon name="material-symbols:image-rounded" class="text-xs" />
                <span>{{ img.title }}</span>
              </div>
              <img
                :src="img.url"
                :alt="img.title || 'Imagem da questão'"
                class="max-h-64 rounded-lg object-contain"
              />
            </div>
          </div>
        </div>

        <!-- ALTERNATIVAS DO CARD -->
        <div class="mt-4 space-y-2">
          <div
            v-for="opt in (q.options || [])"
            :key="opt.letter"
            class="flex items-start gap-3 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] p-3 text-xs text-[var(--student-text)] font-medium"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--student-card)] font-bold text-[var(--student-text)] border border-[var(--student-border)]">
              {{ opt.letter }}
            </span>
            <div class="flex-1 pt-0.5 space-y-1">
              <div v-if="opt.text">{{ opt.text }}</div>
              <div v-if="opt.imageUrl">
                <img
                  :src="opt.imageUrl"
                  alt="Imagem da alternativa"
                  class="max-h-36 rounded-lg border border-[var(--student-border)] bg-white dark:bg-zinc-900 p-1 object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- RESOLVER NO MODO PRÁTICA -->
        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-[var(--student-primary-solid)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            @click="jumpToQuestion(idx); viewMode = 'PRACTICE'"
          >
            <span>Resolver esta questão</span>
            <Icon name="material-symbols:arrow-forward-rounded" class="text-sm" />
          </button>
        </div>
      </div>

      <!-- BOTÃO CARREGAR MAIS NO MODO LISTA -->
      <div v-if="hasMoreListQuestions" class="flex flex-col items-center justify-center gap-2 pt-4 pb-6">
        <p class="text-xs text-[var(--student-text-secondary)]">
          Exibindo <strong>{{ displayedListQuestions.length }}</strong> de <strong>{{ filteredQuestions.length }}</strong> questões
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--student-card)] border border-[var(--student-border)] text-sm font-bold text-[var(--student-text)] shadow-xs hover:border-purple-400 hover:text-purple-600 transition cursor-pointer active:scale-98"
          @click="loadMoreListQuestions"
        >
          <span class="material-symbols-rounded text-lg">expand_more</span>
          <span>Carregar mais questões (+{{ Math.min(15, filteredQuestions.length - displayedListQuestions.length) }})</span>
        </button>
      </div>
    </div>
  </div>
</template>
