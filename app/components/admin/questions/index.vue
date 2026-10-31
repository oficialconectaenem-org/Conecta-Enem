<script setup>
import { useQuestions } from '~/composables/useQuestions'
import QuestionFilters from './QuestionFilters.vue'
import QuestionCard from './QuestionCard.vue'
import QuestionEmptyState from './QuestionEmptyState.vue'
import DeleteQuestion from './DeleteQuestion.vue'
import ImportQuestionsModal from './ImportQuestionsModal.vue'

const { questions, loading, error, getQuestions } = useQuestions()

const subjects = ref([])
const loadingSubjects = ref(true)

const filters = reactive({
  search: '',
  subjectId: '',
  difficulty: '',
  status: '',
  year: ''
})

// Modal states
const viewingQuestion = ref(null)
const deletingQuestionId = ref(null)
const showDeleteModal = ref(false)

// Estado da Importação em TXT ou JSON
const showTxtJsonModal = ref(false)

// Estado da Importação Nativa do ENEM
const showImportModal = ref(false)
const selectedImportYear = ref(2023)
const importingEnem = ref(false)
const importSuccessMessage = ref('')
const importErrorMessage = ref('')

async function runEnemImport() {
  importingEnem.value = true
  importSuccessMessage.value = ''
  importErrorMessage.value = ''

  try {
    const res = await $fetch('/api/admin/questions/import-enem', {
      method: 'POST',
      body: { year: Number(selectedImportYear.value) }
    })
    importSuccessMessage.value = `ENEM ${res.year} importado com sucesso! (${res.imported} novas adicionadas, ${res.updated} atualizadas).`
    await Promise.all([getQuestions(), loadSubjects()])
    setTimeout(() => {
      showImportModal.value = false
      importSuccessMessage.value = ''
    }, 2500)
  } catch (err) {
    console.error('Erro na importação:', err)
    const detailed = err?.data?.message || err?.data?.statusMessage || err?.message
    importErrorMessage.value = detailed === 'Server Error' ? 'Erro de comunicação ou banco de dados no servidor. Verifique os logs e a conexão.' : (detailed || 'Erro ao importar prova do ENEM.')
  } finally {
    importingEnem.value = false
  }
}

const hasFilters = computed(() => {
  return Boolean(
    filters.search ||
    filters.subjectId ||
    filters.difficulty ||
    filters.status ||
    filters.year
  )
})

const filteredQuestions = computed(() => {
  const list = questions.value || []
  if (!Array.isArray(list)) return []

  return list.filter((q) => {
    if (filters.search) {
      const term = filters.search.toLowerCase().trim()
      const inStatement = q.statement?.toLowerCase().includes(term)
      const inTitle = q.title?.toLowerCase().includes(term)
      if (!inStatement && !inTitle) return false
    }

    if (filters.subjectId) {
      const sId = q.subjectId || q.subject?.id
      if (sId !== filters.subjectId) return false
    }

    if (filters.difficulty) {
      if (q.difficulty !== filters.difficulty) return false
    }

    if (filters.status === 'ACTIVE' && q.active === false) return false
    if (filters.status === 'INACTIVE' && q.active === true) return false

    if (filters.year && q.year !== Number(filters.year)) return false

    return true
  })
})

// Limite progressivo de exibição para máxima performance no DOM
const displayLimit = ref(24)

watch(filters, () => {
  displayLimit.value = 24
}, { deep: true })

const displayedQuestions = computed(() => {
  return filteredQuestions.value.slice(0, displayLimit.value)
})

const hasMoreQuestions = computed(() => {
  return displayLimit.value < filteredQuestions.value.length
})

function loadMoreQuestions() {
  displayLimit.value += 24
}

// Metrics
const totalCount = computed(() => (Array.isArray(questions.value) ? questions.value.length : 0))
const easyCount = computed(() => (Array.isArray(questions.value) ? questions.value.filter(q => q.difficulty === 'EASY').length : 0))
const mediumCount = computed(() => (Array.isArray(questions.value) ? questions.value.filter(q => q.difficulty === 'MEDIUM').length : 0))
const hardCount = computed(() => (Array.isArray(questions.value) ? questions.value.filter(q => q.difficulty === 'HARD').length : 0))

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

function handleFilterUpdate(newFilters) {
  Object.assign(filters, newFilters)
}

function clearFilters() {
  filters.search = ''
  filters.subjectId = ''
  filters.difficulty = ''
  filters.status = ''
  filters.year = ''
}

const activeViewingImageIndex = ref(0)

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

function handleView(question) {
  viewingQuestion.value = question
  activeViewingImageIndex.value = 0
}

function closeView() {
  viewingQuestion.value = null
  activeViewingImageIndex.value = 0
}

function handleEdit(question) {
  navigateTo(`/admin/questoes/editar/${question.id}`)
}

function handleDelete(question) {
  deletingQuestionId.value = question.id
  showDeleteModal.value = true
}

function handleDeleted(id) {
  showDeleteModal.value = false
  deletingQuestionId.value = null
  getQuestions()
}

function formatStatement(stmt) {
  if (!stmt) return ''
  let html = stmt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Converte imagens inline do Markdown: ![alt](url) ou ![](url) em tags <img> reais
  html = html.replace(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/gi, (match, alt, url) => {
    return `<img src="${url}" alt="${alt || 'Figura da questão'}" class="inline-block max-h-56 max-w-full my-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-2xs object-contain" />`
  })

  // Transforma **TEXTO I**, **TEXTO 1**, **Texto 1** em badges de destaque
  html = html.replace(/(?:^|\n+)(?:\*{0,2}(TEXTO\s+[IVXLCDM\d]+[^\*\n]*)\*{0,2})/gi, (match, p1) => {
    return `<div class="mt-3 mb-1.5"><span class="inline-flex items-center gap-1.5 rounded-lg bg-purple-100 text-purple-700 px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-2xs">${p1.trim()}</span></div>`
  })

  // Transforma **bold**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')

  // Transforma _itálico_
  html = html.replace(/_([^_]+)_/g, '<span class="italic text-xs opacity-75 block mt-1">$1</span>')

  return html
}

onMounted(() => {
  getQuestions()
  loadSubjects()
})
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-wider text-purple-600">
          Conteúdo & Avaliações
        </p>
        <h1 class="mt-1 text-3xl font-black text-zinc-900">
          Banco de questões
        </h1>
        <p class="mt-1 text-sm text-zinc-500">
          Gerencie e cadastre questões do ENEM por matéria, ano e dificuldade.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 px-5 py-3.5 text-sm font-bold text-purple-700 dark:text-purple-300 transition hover:bg-purple-100 dark:hover:bg-purple-900/60 cursor-pointer shadow-xs active:scale-98"
          @click="showTxtJsonModal = true"
        >
          <span class="material-symbols-rounded text-lg">post_add</span>
          <span>Adicionar em JSON ou TXT</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-3.5 text-sm font-bold text-purple-700 transition hover:bg-purple-100 cursor-pointer shadow-xs active:scale-98"
          @click="showImportModal = true"
        >
          <span class="material-symbols-rounded text-lg">cloud_download</span>
          <span>Importar do ENEM</span>
        </button>

        <NuxtLink
          to="/admin/questoes/nova"
          class="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition hover:bg-purple-700 active:scale-98"
        >
          <span class="material-symbols-rounded text-lg">add</span>
          <span>Nova questão</span>
        </NuxtLink>
      </div>
    </div>

    <!-- METRICS CARDS -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-colors">
        <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total de questões</p>
        <p class="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ totalCount }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 transition-colors">
        <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Fáceis</p>
        <p class="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">{{ easyCount }}</p>
      </div>
      <div class="rounded-2xl border border-amber-100 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 transition-colors">
        <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">Médias</p>
        <p class="mt-1 text-2xl font-black text-amber-800 dark:text-amber-300">{{ mediumCount }}</p>
      </div>
      <div class="rounded-2xl border border-red-100 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 p-4 transition-colors">
        <p class="text-xs font-semibold text-red-700 dark:text-red-400">Difíceis</p>
        <p class="mt-1 text-2xl font-black text-red-800 dark:text-red-300">{{ hardCount }}</p>
      </div>
    </div>

    <!-- FILTERS -->
    <QuestionFilters
      :filters="filters"
      :subjects="subjects"
      :has-filters="hasFilters"
      @update="handleFilterUpdate"
      @clear="clearFilters"
    />

    <!-- ERROR STATE -->
    <div
      v-if="error"
      class="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-rounded">error</span>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        class="font-bold underline hover:no-underline"
        @click="getQuestions()"
      >
        Tentar novamente
      </button>
    </div>

    <!-- LOADING SKELETON -->
    <div
      v-if="loading"
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="n in 6"
        :key="n"
        class="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5"
      >
        <div class="flex justify-between">
          <div class="h-6 w-24 rounded-lg bg-zinc-100"></div>
          <div class="h-6 w-16 rounded-full bg-zinc-100"></div>
        </div>
        <div class="mt-6 space-y-3">
          <div class="h-4 w-full rounded-md bg-zinc-100"></div>
          <div class="h-4 w-4/5 rounded-md bg-zinc-100"></div>
          <div class="h-4 w-2/3 rounded-md bg-zinc-100"></div>
        </div>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <QuestionEmptyState
      v-else-if="filteredQuestions.length === 0"
      :filtered="hasFilters"
      @clear="clearFilters"
      @create="navigateTo('/admin/questoes/nova')"
    />

    <!-- QUESTION CARDS GRID COM CARREGAMENTO PROGRESSIVO -->
    <div
      v-else
      class="space-y-6"
    >
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <QuestionCard
          v-for="question in displayedQuestions"
          :key="question.id"
          :question="question"
          @view="handleView(question)"
          @edit="handleEdit(question)"
          @delete="handleDelete(question)"
        />
      </div>

      <!-- BOTÃO CARREGAR MAIS -->
      <div v-if="hasMoreQuestions" class="flex flex-col items-center justify-center gap-2 pt-4 pb-2">
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          Exibindo <strong>{{ displayedQuestions.length }}</strong> de <strong>{{ filteredQuestions.length }}</strong> questões
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-zinc-800 dark:text-zinc-200 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer active:scale-98"
          @click="loadMoreQuestions"
        >
          <span class="material-symbols-rounded text-lg">expand_more</span>
          <span>Carregar mais questões (+{{ Math.min(24, filteredQuestions.length - displayedQuestions.length) }})</span>
        </button>
      </div>
    </div>

    <!-- MODAL DE VISUALIZAÇÃO DE QUESTÃO -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="viewingQuestion"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
          @click.self="closeView"
        >
          <div class="my-8 w-full max-w-3xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
            <!-- MODAL HEADER -->
            <div class="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-lg bg-purple-100 dark:bg-purple-950/70 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                  {{ viewingQuestion.subject?.name || viewingQuestion.subjectName || "Sem matéria" }}
                </span>
                <span
                  class="rounded-lg px-3 py-1 text-xs font-bold"
                  :class="
                    viewingQuestion.difficulty === 'EASY'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      : viewingQuestion.difficulty === 'HARD'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                  "
                >
                  {{ viewingQuestion.difficulty === 'EASY' ? 'Fácil' : (viewingQuestion.difficulty === 'HARD' ? 'Difícil' : 'Média') }}
                </span>
                <span
                  v-if="viewingQuestion.year"
                  class="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  ENEM {{ viewingQuestion.year }}
                </span>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
                @click="closeView"
              >
                <span class="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <!-- TÍTULO -->
            <h3
              v-if="viewingQuestion.title"
              class="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              {{ viewingQuestion.title }}
            </h3>

            <!-- ENUNCIADO -->
            <div
              class="mt-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/60 p-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-line border border-zinc-100 dark:border-zinc-800"
              v-html="formatStatement(viewingQuestion.statement)"
            ></div>

            <!-- IMAGENS DA QUESTÃO -->
            <div
              v-if="getQuestionImages(viewingQuestion).length > 0"
              class="mt-4 space-y-3"
            >
              <!-- IMAGEM EM DESTAQUE COM TÍTULO -->
              <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-4 text-center space-y-2">
                <div class="inline-flex items-center gap-2 rounded-lg bg-purple-100 dark:bg-purple-950/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">
                  <span class="material-symbols-rounded text-sm">image</span>
                  <span>{{ (getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.title }}</span>
                </div>
                <div>
                  <img
                    :src="(getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.url"
                    :alt="(getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.title"
                    class="max-h-80 mx-auto rounded-xl object-contain shadow-xs bg-white p-1 rounded-xl"
                  />
                </div>
              </div>

              <!-- MINIATURAS SE HOUVER MAIS DE UMA -->
              <div
                v-if="getQuestionImages(viewingQuestion).length > 1"
                class="flex items-center justify-center gap-2 overflow-x-auto py-1"
              >
                <button
                  v-for="(img, idx) in getQuestionImages(viewingQuestion)"
                  :key="idx"
                  type="button"
                  class="relative flex flex-col items-center shrink-0 overflow-hidden rounded-xl border-2 transition p-1 bg-white dark:bg-zinc-800"
                  :class="activeViewingImageIndex === idx
                    ? 'border-purple-600 ring-2 ring-purple-600/20'
                    : 'border-zinc-200 dark:border-zinc-700 opacity-70 hover:opacity-100'"
                  @click="activeViewingImageIndex = idx"
                >
                  <img
                    :src="img.url"
                    :alt="img.title"
                    class="h-12 w-16 object-contain bg-zinc-100 dark:bg-zinc-700 rounded-lg p-0.5"
                  />
                  <span class="mt-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[70px]">
                    {{ img.title || (idx + 1) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- ALTERNATIVAS -->
            <div class="mt-6 space-y-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Alternativas
              </h4>

              <div
                v-for="option in (viewingQuestion.options || viewingQuestion.alternatives || [])"
                :key="option.letter"
                class="flex items-start gap-3 rounded-2xl border p-4 transition"
                :class="
                  viewingQuestion.correctAnswer === option.letter
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40'
                "
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-extrabold text-sm"
                  :class="
                    viewingQuestion.correctAnswer === option.letter
                      ? 'bg-emerald-600 text-white'
                      : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                  "
                >
                  {{ option.letter }}
                </span>

                <div class="flex-1 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed pt-1 space-y-2">
                  <div v-if="option.text || option.content">
                    {{ option.text || option.content }}
                  </div>
                  <div v-if="option.imageUrl" class="pt-1">
                    <img
                      :src="option.imageUrl"
                      alt="Imagem da alternativa"
                      class="max-h-48 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1 object-contain"
                    />
                  </div>
                  <div v-if="!option.text && !option.content && !option.imageUrl" class="text-zinc-400 italic">
                    (Sem conteúdo)
                  </div>
                </div>

                <span
                  v-if="viewingQuestion.correctAnswer === option.letter"
                  class="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-1 rounded-lg"
                >
                  <span class="material-symbols-rounded text-sm">check</span>
                  Gabarito
                </span>
              </div>
            </div>

            <!-- RESOLUÇÃO COMENTADA -->
            <div
              v-if="viewingQuestion.explanation"
              class="mt-6 rounded-2xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/30 p-5"
            >
              <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">
                <span class="material-symbols-rounded text-base">lightbulb</span>
                <span>Resolução comentada</span>
              </div>
              <p class="mt-2 text-sm leading-relaxed text-purple-950 dark:text-purple-200 whitespace-pre-line">
                {{ viewingQuestion.explanation }}
              </p>
            </div>

            <!-- MODAL ACTIONS -->
            <div class="mt-8 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <button
                type="button"
                class="rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                @click="closeView"
              >
                Fechar
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 cursor-pointer"
                @click="handleEdit(viewingQuestion)"
              >
                <span class="material-symbols-rounded text-sm">edit</span>
                <span>Editar questão</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- MODAL DE IMPORTAÇÃO PERSONALIZADA EM TXT OU JSON COM LIVE PREVIEW -->
    <ImportQuestionsModal
      :show="showTxtJsonModal"
      :subjects="subjects"
      @close="showTxtJsonModal = false"
      @imported="getQuestions"
    />

    <!-- MODAL DE EXCLUSÃO -->
    <DeleteQuestion
      v-if="deletingQuestionId"
      :id="deletingQuestionId"
      :model-value="showDeleteModal"
      hide-trigger
      @deleted="handleDeleted"
      @close="showDeleteModal = false; deletingQuestionId = null"
    />

    <!-- MODAL DE IMPORTAÇÃO NATIVA DO ENEM -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showImportModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          @click.self="!importingEnem && (showImportModal = false)"
        >
          <div class="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-6 sm:p-8">
            <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  <span class="material-symbols-rounded text-2xl">cloud_download</span>
                </div>
                <div>
                  <h3 class="text-xl font-black text-zinc-900 dark:text-zinc-100">
                    Importar Prova do ENEM
                  </h3>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">
                    Integração oficial direta para o seu banco de dados
                  </p>
                </div>
              </div>

              <button
                type="button"
                :disabled="importingEnem"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50"
                @click="showImportModal = false"
              >
                <span class="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <!-- MENSAGENS DE SUCESSO OU ERRO -->
            <div
              v-if="importSuccessMessage"
              class="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            >
              <span class="material-symbols-rounded text-lg shrink-0">check_circle</span>
              <span>{{ importSuccessMessage }}</span>
            </div>

            <div
              v-if="importErrorMessage"
              class="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-bold text-red-700 dark:text-red-300"
            >
              <span class="material-symbols-rounded text-lg shrink-0">error</span>
              <span>{{ importErrorMessage }}</span>
            </div>

            <!-- SELEÇÃO DE ANO -->
            <div class="space-y-3">
              <label class="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Selecione o Ano da Prova
              </label>
              <select
                v-model="selectedImportYear"
                :disabled="importingEnem"
                class="h-12 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-4 text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none transition focus:border-purple-600 focus:bg-white dark:focus:bg-zinc-800"
              >
                <option :value="2023">ENEM 2023 (181 questões oficiais)</option>
                <option :value="2022">ENEM 2022 (183 questões oficiais)</option>
                <option :value="2021">ENEM 2021 (180 questões oficiais)</option>
                <option :value="2020">ENEM 2020 (180 questões oficiais)</option>
                <option :value="2019">ENEM 2019 (180 questões oficiais)</option>
                <option :value="2018">ENEM 2018 (180 questões oficiais)</option>
                <option :value="2017">ENEM 2017 (180 questões oficiais)</option>
                <option :value="2016">ENEM 2016 (180 questões oficiais)</option>
                <option :value="2015">ENEM 2015 (180 questões oficiais)</option>
              </select>
            </div>

            <!-- DESTAQUES DA INTEGRAÇÃO NATIVA -->
            <div class="space-y-2 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 p-4 border border-purple-100 dark:border-purple-900/40 text-xs text-zinc-600 dark:text-zinc-300">
              <div class="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                <span class="material-symbols-rounded text-base text-purple-600 dark:text-purple-400">verified</span>
                <span>Processamento Inteligente Incluso:</span>
              </div>
              <ul class="space-y-1.5 pl-6 list-disc text-zinc-600 dark:text-zinc-300">
                <li>Separação automática em matérias individuais (*Física, Química, Biologia, História, etc.*).</li>
                <li>Cálculo de dificuldade proporcional (*Fácil, Média, Difícil*).</li>
                <li>Importação de textos de apoio (Texto 1, 2, 3...) e gabaritos oficiais.</li>
              </ul>
            </div>

            <!-- AÇÕES DO MODAL -->
            <div class="flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <button
                type="button"
                :disabled="importingEnem"
                class="rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                @click="showImportModal = false"
              >
                Cancelar
              </button>

              <button
                type="button"
                :disabled="importingEnem"
                class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-purple-700 disabled:opacity-60 cursor-pointer shadow-md shadow-purple-600/20 active:scale-98"
                @click="runEnemImport"
              >
                <span v-if="importingEnem" class="material-symbols-rounded animate-spin text-base">progress_activity</span>
                <span v-else class="material-symbols-rounded text-base">download</span>
                <span>{{ importingEnem ? 'Importando prova...' : `Importar ENEM ${selectedImportYear}` }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL DE IMPORTAÇÃO PERSONALIZADA EM TXT OU JSON COM LIVE PREVIEW -->
    <ImportQuestionsModal
      :show="showTxtJsonModal"
      :subjects="subjects"
      @close="showTxtJsonModal = false"
      @imported="getQuestions"
    />
  </div>
</template>