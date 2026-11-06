<script setup>
import { useQuestions } from '~/composables/useQuestions'
import { identifyQuestionSubject, CANONICAL_SLUG_MAP } from '#shared/utils/subject-classifier'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Banco de Questões — Conecta Enem'
})

const { questions, loading, error, getQuestions } = useQuestions()

const subjects = ref([])
const loadingSubjects = ref(true)

// Filtros Principais
const selectedSubjectId = ref('')
const selectedDifficulty = ref('')
const selectedYear = ref('')
const searchQuery = ref('')
const selectedStatusFilter = ref('ALL') // 'ALL', 'UNANSWERED', 'CORRECT', 'INCORRECT'

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

// Anos disponíveis extraídos das questões
const availableYears = computed(() => {
  const years = new Set()
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.year && q.active !== false) years.add(q.year)
    })
  }
  return Array.from(years).sort((a, b) => b - a)
})

// Paginação progressiva para o modo lista
const listDisplayLimit = ref(15)

watch([selectedSubjectId, selectedDifficulty, selectedYear, searchQuery, selectedStatusFilter], () => {
  listDisplayLimit.value = 15
})

const displayedListQuestions = computed(() => {
  return filteredQuestions.value.slice(0, listDisplayLimit.value)
})

const hasMoreListQuestions = computed(() => {
  return listDisplayLimit.value < filteredQuestions.value.length
})

function loadMoreListQuestions() {
  listDisplayLimit.value += 15
}

/**
 * Validação Semântica Rigorosa de Matéria:
 * Garante que questões cadastradas com matéria errada ou sem matéria
 * não vazem para outras disciplinas ao clicar no filtro.
 */
function matchQuestionToSelectedSubject(q, targetSub) {
  if (!targetSub) return true

  const targetSlug = targetSub.slug || targetSub.name || targetSub.id
  const targetId = targetSub.id
  const targetCanonical = CANONICAL_SLUG_MAP[targetSlug] || targetSlug

  // 1. Identifica a matéria informada na questão
  const qSub = q.subject || subjects.value.find(s => s.id === (q.subjectId || q.subject?.id))
  const qSlug = qSub?.slug || q.subjectSlug || ''
  const qCanonical = CANONICAL_SLUG_MAP[qSlug] || qSlug

  // 2. Classifica a questão em tempo real com base no seu texto
  const detectedSlug = identifyQuestionSubject(q, qCanonical)
  const detectedCanonical = CANONICAL_SLUG_MAP[detectedSlug] || detectedSlug

  // 3. Se o classificador detectou com clareza que o conteúdo é de OUTRA matéria (ex: Biologia cadastrada como Física),
  // descarta a questão do filtro atual para evitar contaminação
  if (detectedCanonical && detectedCanonical !== targetCanonical) {
    return false
  }

  // 4. Se o classificador confirmou a matéria alvo
  if (detectedCanonical === targetCanonical) {
    return true
  }

  // 5. Fallback para quando não há termos fortes no texto: respeita o ID original cadastrado
  if (q.subjectId === targetId || q.subject?.id === targetId) {
    return true
  }

  return false
}

// Lista Filtrada de Questões (Ultra Otimizada)
const filteredQuestions = computed(() => {
  const list = questions.value || []
  if (!Array.isArray(list) || list.length === 0) return []

  const targetSub = selectedSubjectId.value
    ? subjects.value.find(s => s.id === selectedSubjectId.value)
    : null

  const statusFilter = selectedStatusFilter.value
  const diffFilter = selectedDifficulty.value
  const yearFilter = selectedYear.value ? Number(selectedYear.value) : null
  const term = searchQuery.value?.toLowerCase().trim()

  return list.filter((q) => {
    // Apenas questões ativas para alunos
    if (q.active === false) return false

    // Filtro rigoroso de Matéria (sem vazamentos de outras disciplinas, com cache instantâneo)
    if (targetSub) {
      if (!matchQuestionToSelectedSubject(q, targetSub)) {
        return false
      }
    }

    // Dificuldade
    if (diffFilter && q.difficulty !== diffFilter) {
      return false
    }

    // Ano do ENEM
    if (yearFilter && q.year !== yearFilter) {
      return false
    }

    // Busca inteligente no enunciado, título ou alternativas
    if (term) {
      const inStatement = q.statement?.toLowerCase().includes(term)
      const inTitle = q.title?.toLowerCase().includes(term)
      const inOptions = Array.isArray(q.options) && q.options.some(opt => opt.text?.toLowerCase().includes(term))
      if (!inStatement && !inTitle && !inOptions) return false
    }

    // Status no histórico do aluno: SOMENTE lê sessionAnswers se o filtro não for ALL (evita re-render de 100% da lista ao clicar)
    if (statusFilter !== 'ALL') {
      const ans = sessionAnswers[q.id]
      if (statusFilter === 'UNANSWERED' && ans) return false
      if (statusFilter === 'CORRECT' && (!ans || !ans.correct)) return false
      if (statusFilter === 'INCORRECT' && (!ans || ans.correct)) return false
    }

    return true
  })
})

// Current active question in practice mode
const currentQuestion = computed(() => {
  if (filteredQuestions.value.length === 0) return null
  const idx = Math.min(currentIndex.value, filteredQuestions.value.length - 1)
  return filteredQuestions.value[idx] || null
})

// Enunciado formatado em cache reativo para evitar re-executar regex em cada clique de alternativa
const formattedCurrentStatement = computed(() => {
  return formatStatement(currentQuestion.value?.statement)
})

// Imagens da questão atual em cache reativo para evitar JSON.parse repetido no template
const currentQuestionImages = computed(() => {
  return getQuestionImages(currentQuestion.value)
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

const questionImagesCache = new WeakMap()
function getQuestionImages(q) {
  if (!q) return []
  if (typeof q === 'object') {
    const cached = questionImagesCache.get(q)
    if (cached) return cached
  }
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
  if (typeof q === 'object') {
    questionImagesCache.set(q, list)
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

let saveStorageTimeout = null
function saveAnswersToLocalStorage() {
  if (saveStorageTimeout) clearTimeout(saveStorageTimeout)
  saveStorageTimeout = setTimeout(() => {
    try {
      localStorage.setItem('conecta_student_answers', JSON.stringify(sessionAnswers))
    } catch {}
  }, 250)
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

const statementCache = new Map()
function formatStatement(stmt) {
  if (!stmt) return ''
  const cached = statementCache.get(stmt)
  if (cached) return cached

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

  statementCache.set(stmt, html)
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
  currentIndex.value = 0
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
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
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
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
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

    <!-- FILTROS POR MATÉRIA (TABS/CHIPS) -->
    <section class="mt-8">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          class="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          :class="
            selectedSubjectId === ''
              ? 'bg-[var(--student-primary-solid)] text-white shadow-sm'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:border-purple-400 hover:text-[var(--student-text)]'
          "
          @click="selectedSubjectId = ''; currentIndex = 0"
        >
          Todas as matérias
        </button>

        <button
          v-for="sub in subjects"
          :key="sub.id"
          type="button"
          class="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          :class="
            selectedSubjectId === sub.id
              ? 'bg-[var(--student-primary-solid)] text-white shadow-sm'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:border-purple-400 hover:text-[var(--student-text)]'
          "
          @click="selectedSubjectId = selectedSubjectId === sub.id ? '' : sub.id; currentIndex = 0"
        >
          {{ sub.name }}
        </button>
      </div>
    </section>

    <!-- BARRA DE FILTROS SECUNDÁRIOS -->
    <section class="mt-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-3.5 shadow-xs">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)_auto]">
        <!-- BUSCA -->
        <div class="relative">
          <Icon
            name="material-symbols:search-rounded"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--student-text-muted)]"
          />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar por termo..."
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] pl-9 pr-8 text-xs text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @input="currentIndex = 0"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--student-text-muted)] hover:text-red-500 p-1 cursor-pointer"
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
          <option value="EASY">Fácil</option>
          <option value="MEDIUM">Média</option>
          <option value="HARD">Difícil</option>
        </select>

        <!-- ANO -->
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
            ENEM {{ year }}
          </option>
        </select>

        <!-- STATUS -->
        <select
          v-model="selectedStatusFilter"
          class="h-10 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-xs font-medium text-[var(--student-text)] outline-none transition focus:border-purple-500"
          @change="currentIndex = 0"
        >
          <option value="ALL">Todas as questões</option>
          <option value="UNANSWERED">Não respondidas</option>
          <option value="CORRECT">Acertadas</option>
          <option value="INCORRECT">Erradas</option>
        </select>

        <!-- LIMPAR -->
        <button
          v-if="selectedSubjectId || selectedDifficulty || selectedYear || searchQuery || selectedStatusFilter !== 'ALL'"
          type="button"
          class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--student-border)] px-3 text-xs font-bold text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface)] cursor-pointer"
          @click="clearFilters"
        >
          <Icon name="material-symbols:filter-alt-off-rounded" class="text-sm" />
          <span>Limpar</span>
        </button>
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
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--student-primary-solid)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 cursor-pointer"
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
          v-html="formattedCurrentStatement"
        ></div>

        <!-- IMAGENS DA QUESTÃO -->
        <div
          v-if="currentQuestionImages.length > 0"
          class="mt-6 space-y-3"
        >
          <!-- IMAGEM EM DESTAQUE COM TÍTULO -->
          <div class="relative overflow-hidden rounded-2xl border border-[var(--student-border)] bg-white dark:bg-zinc-900 shadow-sm flex flex-col items-center">
            <div
              v-if="currentQuestionImages[studentActiveImageIndex]?.title"
              class="w-full bg-[var(--student-surface)] px-4 py-2 border-b border-[var(--student-border)] flex items-center justify-between"
            >
              <span class="text-xs font-black text-[var(--student-primary-text)] uppercase tracking-wider">
                {{ currentQuestionImages[studentActiveImageIndex]?.title }}
              </span>
              <span class="text-[10px] font-bold text-[var(--student-text-muted)]">
                {{ studentActiveImageIndex + 1 }} de {{ currentQuestionImages.length }}
              </span>
            </div>
            <div class="p-3 w-full flex items-center justify-center">
              <img
                :src="currentQuestionImages[studentActiveImageIndex]?.url"
                :alt="currentQuestionImages[studentActiveImageIndex]?.title || 'Imagem da questão'"
                class="max-h-96 w-auto object-contain rounded-xl transition-all duration-200"
              />
            </div>
          </div>

          <!-- MINIATURAS QUANDO HOUVER MAIS DE UMA IMAGEM -->
          <div
            v-if="currentQuestionImages.length > 1"
            class="flex items-center gap-2 overflow-x-auto pb-1"
          >
            <button
              v-for="(img, idx) in currentQuestionImages"
              :key="idx"
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shrink-0"
              :class="studentActiveImageIndex === idx
                ? 'border-[var(--student-primary-solid)] bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] shadow-xs'
                : 'border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-text-secondary)] hover:border-purple-300'"
              @click="studentActiveImageIndex = idx"
            >
              <Icon name="material-symbols:image-outline-rounded" class="text-sm" />
              <span>{{ img.title || `Figura ${idx + 1}` }}</span>
            </button>
          </div>
        </div>

        <!-- ALTERNATIVAS -->
        <div class="mt-6 space-y-3">
          <button
            v-for="opt in currentQuestion.options"
            :key="opt.id || opt.letter"
            type="button"
            class="flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-colors cursor-pointer"
            :class="[
              // Se já respondeu
              currentQuestionAnswer
                ? opt.letter === currentQuestion.correctAnswer
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                  : currentQuestionAnswer.selected === opt.letter
                    ? 'border-red-500 bg-red-500/10 text-red-950 dark:text-red-100 ring-2 ring-red-500/20'
                    : 'border-[var(--student-border)] bg-[var(--student-card)] opacity-60'
                // Se ainda está selecionando
                : selectedOption === opt.letter
                  ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                  : 'border-[var(--student-border)] bg-[var(--student-card)] hover:border-purple-300 hover:bg-[var(--student-surface)]'
            ]"
            :disabled="Boolean(currentQuestionAnswer)"
            @click="selectOption(opt.letter)"
          >
            <!-- LETRA -->
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors"
              :class="[
                currentQuestionAnswer
                  ? opt.letter === currentQuestion.correctAnswer
                    ? 'bg-emerald-500 text-white'
                    : currentQuestionAnswer.selected === opt.letter
                      ? 'bg-red-500 text-white'
                      : 'border border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-text-secondary)]'
                  : selectedOption === opt.letter
                    ? 'bg-purple-600 text-white'
                    : 'border border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-text-secondary)]'
              ]"
            >
              {{ opt.letter }}
            </span>

            <!-- TEXTO DA ALTERNATIVA -->
            <div class="flex-1 pt-1 text-sm font-medium leading-relaxed text-[var(--student-text)]">
              <span>{{ opt.text }}</span>
            </div>

            <!-- ÍCONE DE RESULTADO -->
            <div v-if="currentQuestionAnswer" class="pt-1">
              <Icon
                v-if="opt.letter === currentQuestion.correctAnswer"
                name="material-symbols:check-circle-rounded"
                class="text-xl text-emerald-500"
              />
              <Icon
                v-else-if="currentQuestionAnswer.selected === opt.letter"
                name="material-symbols:cancel-rounded"
                class="text-xl text-red-500"
              />
            </div>
          </button>
        </div>

        <!-- BARRA DE AÇÃO / FEEDBACK -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--student-border)] pt-5">
          <div>
            <span
              v-if="!currentQuestionAnswer && selectedOption"
              class="text-xs font-semibold text-[var(--student-text-secondary)]"
            >
              Alternativa <strong>{{ selectedOption }}</strong> selecionada
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- BOTÃO DE RESETAR QUESTÃO -->
            <button
              v-if="currentQuestionAnswer"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-4 py-2.5 text-xs font-bold text-[var(--student-text-secondary)] transition hover:text-[var(--student-text)] cursor-pointer"
              @click="resetCurrentQuestion"
            >
              <Icon name="material-symbols:restart-alt-rounded" class="text-sm" />
              <span>Refazer Questão</span>
            </button>

            <!-- BOTÃO DE CONFIRMAR RESPOSTA -->
            <button
              v-if="!currentQuestionAnswer"
              type="button"
              class="inline-flex items-center gap-2 rounded-xl bg-[var(--student-primary-solid)] px-6 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
              :disabled="!selectedOption"
              @click="submitAnswer"
            >
              <Icon name="material-symbols:check-rounded" class="text-base" />
              <span>Confirmar Resposta</span>
            </button>
          </div>
        </div>

        <!-- RESOLUÇÃO COMENTADA -->
        <div
          v-if="currentQuestionAnswer && currentQuestion.explanation"
          class="mt-6 rounded-2xl border border-purple-200 bg-purple-500/5 p-5 dark:border-purple-900/40"
        >
          <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
            <Icon name="material-symbols:lightbulb-rounded" class="text-lg" />
            <span>Resolução Comentada</span>
          </div>
          <div class="mt-2 text-sm leading-relaxed text-[var(--student-text)] whitespace-pre-line">
            {{ currentQuestion.explanation }}
          </div>
        </div>
      </section>

      <!-- SIDEBAR DO NAVEGADOR DE QUESTÕES -->
      <aside class="space-y-4">
        <!-- NAVEGADOR RÁPIDO (GRADE NUMÉRICA) -->
        <div class="student-card rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 shadow-sm">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--student-border)]">
            <span class="text-xs font-black uppercase tracking-wider text-[var(--student-text)]">
              Navegador
            </span>
            <span class="text-xs font-bold text-[var(--student-text-secondary)]">
              {{ filteredQuestions.length }} questões
            </span>
          </div>

          <!-- GRADE -->
          <div class="mt-4 grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
            <button
              v-for="(q, idx) in filteredQuestions"
              :key="q.id"
              type="button"
              class="flex h-9 items-center justify-center rounded-xl text-xs font-bold transition-colors cursor-pointer"
              :class="[
                currentIndex === idx
                  ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-zinc-900'
                  : '',
                sessionAnswers[q.id]
                  ? sessionAnswers[q.id].correct
                    ? 'bg-emerald-500 text-white font-black'
                    : 'bg-red-500 text-white font-black'
                  : 'border border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-text)] hover:border-purple-400'
              ]"
              @click="jumpToQuestion(idx)"
            >
              {{ idx + 1 }}
            </button>
          </div>

          <!-- LEGENDA -->
          <div class="mt-4 pt-3 border-t border-[var(--student-border)] flex items-center justify-between text-[11px] font-semibold text-[var(--student-text-secondary)]">
            <div class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span>Acertou</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span>Errou</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-full border border-[var(--student-border)] bg-[var(--student-surface)]"></span>
              <span>Pendente</span>
            </div>
          </div>
        </div>

        <!-- BOTÕES PRÓXIMA / ANTERIOR -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-3 text-xs font-bold text-[var(--student-text)] transition hover:bg-[var(--student-surface)] disabled:opacity-40 cursor-pointer"
            :disabled="currentIndex === 0"
            @click="prevQuestion"
          >
            <Icon name="material-symbols:arrow-back-rounded" class="text-base" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--student-primary-solid)] p-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            :disabled="currentIndex >= filteredQuestions.length - 1"
            @click="nextQuestion"
          >
            <span>Próxima</span>
            <Icon name="material-symbols:arrow-forward-rounded" class="text-base" />
          </button>
        </div>

        <!-- REINICIAR ESTATÍSTICAS DA SESSÃO -->
        <button
          v-if="totalAnswered > 0"
          type="button"
          class="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/50 p-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 cursor-pointer"
          @click="resetStats"
        >
          <Icon name="material-symbols:delete-forever-rounded" class="text-base" />
          <span>Limpar Histórico Local</span>
        </button>
      </aside>
    </div>

    <!-- ==========================================
         MODO LISTA (VISUALIZAÇÃO COMPLETA)
    =========================================== -->
    <div
      v-else-if="viewMode === 'LIST'"
      class="mt-8 space-y-6"
    >
      <article
        v-for="(q, idx) in displayedListQuestions"
        :key="q.id"
        class="student-card rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 shadow-sm transition hover:shadow-md"
      >
        <!-- CABEÇALHO -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--student-border)] pb-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-xl bg-[var(--student-primary-soft)] px-3 py-1 text-xs font-black text-[var(--student-primary-text)]">
              {{ q.subject?.name || "ENEM" }}
            </span>
            <span
              v-if="difficultyLabels[q.difficulty]"
              class="rounded-xl border px-3 py-1 text-xs font-bold"
              :class="difficultyLabels[q.difficulty].class"
            >
              {{ difficultyLabels[q.difficulty].label }}
            </span>
            <span
              v-if="q.year"
              class="rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] px-3 py-1 text-xs font-semibold text-[var(--student-text-secondary)]"
            >
              ENEM {{ q.year }}
            </span>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--student-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--student-primary-text)] transition hover:opacity-80 cursor-pointer"
            @click="jumpToQuestion(idx); viewMode = 'PRACTICE'"
          >
            <span>Resolver no Modo Prática</span>
            <Icon name="material-symbols:play-arrow-rounded" class="text-base" />
          </button>
        </div>

        <!-- TÍTULO -->
        <h3
          v-if="q.title"
          class="mt-4 text-base font-bold text-[var(--student-text)]"
        >
          {{ q.title }}
        </h3>

        <!-- ENUNCIADO -->
        <div
          class="mt-3 text-sm leading-relaxed text-[var(--student-text)]"
          v-html="formatStatement(q.statement)"
        ></div>

        <!-- IMAGENS DA QUESTÃO NO MODO LISTA -->
        <div
          v-if="getQuestionImages(q).length > 0"
          class="mt-4 space-y-2"
        >
          <div
            v-for="(img, imgIdx) in getQuestionImages(q)"
            :key="imgIdx"
            class="inline-block mr-3 mb-2"
          >
            <div class="text-[11px] font-bold text-[var(--student-text-muted)] mb-1">
              {{ img.title || `Figura ${imgIdx + 1}` }}
            </div>
            <img
              :src="img.url"
              :alt="img.title || 'Imagem da questão'"
              class="max-h-64 w-auto rounded-xl border border-[var(--student-border)] bg-white dark:bg-zinc-900 p-1.5 shadow-2xs object-contain"
            />
          </div>
        </div>

        <!-- ALTERNATIVAS (MODO VISUALIZAÇÃO) -->
        <div class="mt-4 grid gap-2 sm:grid-cols-2">
          <div
            v-for="opt in q.options"
            :key="opt.id || opt.letter"
            class="flex items-start gap-2.5 rounded-xl border p-3 text-xs transition"
            :class="[
              sessionAnswers[q.id]
                ? opt.letter === q.correctAnswer
                  ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-950 dark:text-emerald-100'
                  : sessionAnswers[q.id].selected === opt.letter
                    ? 'border-red-500 bg-red-500/10 font-bold text-red-950 dark:text-red-100'
                    : 'border-[var(--student-border)] bg-[var(--student-surface)] opacity-70'
                : 'border-[var(--student-border)] bg-[var(--student-surface)]'
            ]"
          >
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-black"
              :class="opt.letter === q.correctAnswer && sessionAnswers[q.id] ? 'bg-emerald-500 text-white' : 'bg-[var(--student-card)] text-[var(--student-text)]'"
            >
              {{ opt.letter }}
            </span>
            <span class="text-[var(--student-text)] leading-snug">{{ opt.text }}</span>
          </div>
        </div>
      </article>

      <!-- BOTÃO DE CARREGAR MAIS NO MODO LISTA -->
      <div v-if="hasMoreListQuestions" class="flex justify-center pt-4">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] px-6 py-3 text-xs font-bold text-[var(--student-text)] transition hover:bg-[var(--student-surface)] shadow-xs cursor-pointer"
          @click="loadMoreListQuestions"
        >
          <Icon name="material-symbols:expand-more-rounded" class="text-base" />
          <span>Carregar mais 15 questões (Restam {{ filteredQuestions.length - displayedListQuestions.length }})</span>
        </button>
      </div>
    </div>
  </div>
</template>
