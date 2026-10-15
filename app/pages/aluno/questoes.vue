<script setup>
import { useQuestions } from '~/composables/useQuestions'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Banco de Questões — Conecta Enem'
})

const { questions, loading, error, getQuestions } = useQuestions()

const subjects = ref([])
const loadingSubjects = ref(true)

// Filters
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

// Available years extracted from questions
const availableYears = computed(() => {
  const years = new Set()
  if (Array.isArray(questions.value)) {
    questions.value.forEach(q => {
      if (q.year) years.add(q.year)
    })
  }
  return Array.from(years).sort((a, b) => b - a)
})

// Filtered Questions List
const filteredQuestions = computed(() => {
  const list = questions.value || []
  if (!Array.isArray(list)) return []

  return list.filter((q) => {
    // Only active questions for students
    if (q.active === false) return false

    // Subject
    if (selectedSubjectId.value) {
      const sId = q.subjectId || q.subject?.id
      if (sId !== selectedSubjectId.value) return false
    }

    // Difficulty
    if (selectedDifficulty.value && q.difficulty !== selectedDifficulty.value) {
      return false
    }

    // Year
    if (selectedYear.value && q.year !== Number(selectedYear.value)) {
      return false
    }

    // Search
    if (searchQuery.value.trim()) {
      const term = searchQuery.value.toLowerCase().trim()
      const inStatement = q.statement?.toLowerCase().includes(term)
      const inTitle = q.title?.toLowerCase().includes(term)
      if (!inStatement && !inTitle) return false
    }

    // Status filter
    const ans = sessionAnswers[q.id]
    if (selectedStatusFilter.value === 'UNANSWERED' && ans) return false
    if (selectedStatusFilter.value === 'CORRECT' && (!ans || !ans.correct)) return false
    if (selectedStatusFilter.value === 'INCORRECT' && (!ans || ans.correct)) return false

    return true
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
  if (q.images) {
    try {
      const parsed = typeof q.images === 'string' ? JSON.parse(q.images) : q.images
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean)
    } catch {}
  }
  return q.imageUrl ? [q.imageUrl] : []
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

    <!-- FILTROS POR MATÉRIA (TABS/CHIPS) -->
    <section class="mt-8">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          class="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition"
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
          class="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition"
          :class="
            selectedSubjectId === sub.id
              ? 'bg-[var(--student-primary-solid)] text-white shadow-sm'
              : 'border border-[var(--student-border)] bg-[var(--student-card)] text-[var(--student-text-secondary)] hover:border-purple-400 hover:text-[var(--student-text)]'
          "
          @click="selectedSubjectId = sub.id; currentIndex = 0"
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
            class="h-10 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] pl-9 pr-3 text-xs text-[var(--student-text)] outline-none transition focus:border-purple-500"
            @input="currentIndex = 0"
          />
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
          class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--student-border)] px-3 text-xs font-bold text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface)]"
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
        <div class="mt-4 text-sm leading-7 sm:text-base text-[var(--student-text)] whitespace-pre-line">
          {{ currentQuestion.statement }}
        </div>

        <!-- IMAGENS DA QUESTÃO -->
        <div
          v-if="getQuestionImages(currentQuestion).length > 0"
          class="mt-6 space-y-3"
        >
          <!-- IMAGEM EM DESTAQUE -->
          <div class="rounded-2xl border border-[var(--student-border)] bg-[var(--student-card-muted,#f8fafc)] p-3 text-center">
            <img
              :src="getQuestionImages(currentQuestion)[studentActiveImageIndex] || getQuestionImages(currentQuestion)[0]"
              alt="Imagem da questão"
              class="max-h-96 mx-auto rounded-xl object-contain shadow-xs"
            />
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
              class="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer"
              :class="studentActiveImageIndex === idx
                ? 'border-purple-600 ring-2 ring-purple-600/30'
                : 'border-[var(--student-border)] opacity-70 hover:opacity-100'"
              @click="studentActiveImageIndex = idx"
            >
              <img
                :src="img"
                alt="Miniatura"
                class="h-full w-full object-contain bg-slate-100 dark:bg-zinc-800 p-0.5"
              />
              <span class="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] font-bold text-white text-center py-0.5">
                {{ idx + 1 }}
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
        v-for="(q, idx) in filteredQuestions"
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

        <p class="mt-4 text-sm sm:text-base leading-relaxed text-[var(--student-text)] whitespace-pre-line">
          {{ q.statement }}
        </p>

        <div v-if="getQuestionImages(q).length > 0" class="mt-4">
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(img, imgIdx) in getQuestionImages(q)"
              :key="imgIdx"
              class="relative max-h-72 overflow-hidden rounded-xl border border-[var(--student-border)] bg-[var(--student-surface)] p-1"
            >
              <img
                :src="img"
                alt="Imagem da questão"
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
    </div>
  </div>
</template>
