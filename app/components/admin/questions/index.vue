<script setup>
import { useQuestions } from '~/composables/useQuestions'
import QuestionFilters from './QuestionFilters.vue'
import QuestionCard from './QuestionCard.vue'
import QuestionEmptyState from './QuestionEmptyState.vue'
import DeleteQuestion from './DeleteQuestion.vue'

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

      <NuxtLink
        to="/admin/questoes/nova"
        class="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition hover:bg-purple-700"
      >
        <span class="material-symbols-rounded text-lg">add</span>
        <span>Nova questão</span>
      </NuxtLink>
    </div>

    <!-- METRICS CARDS -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl border border-zinc-200 bg-white p-4">
        <p class="text-xs font-semibold text-zinc-500">Total de questões</p>
        <p class="mt-1 text-2xl font-black text-zinc-900">{{ totalCount }}</p>
      </div>
      <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
        <p class="text-xs font-semibold text-emerald-700">Fáceis</p>
        <p class="mt-1 text-2xl font-black text-emerald-800">{{ easyCount }}</p>
      </div>
      <div class="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
        <p class="text-xs font-semibold text-amber-700">Médias</p>
        <p class="mt-1 text-2xl font-black text-amber-800">{{ mediumCount }}</p>
      </div>
      <div class="rounded-2xl border border-red-100 bg-red-50/50 p-4">
        <p class="text-xs font-semibold text-red-700">Difíceis</p>
        <p class="mt-1 text-2xl font-black text-red-800">{{ hardCount }}</p>
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

    <!-- QUESTION CARDS GRID -->
    <div
      v-else
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <QuestionCard
        v-for="question in filteredQuestions"
        :key="question.id"
        :question="question"
        @view="handleView(question)"
        @edit="handleEdit(question)"
        @delete="handleDelete(question)"
      />
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
          <div class="my-8 w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
            <!-- MODAL HEADER -->
            <div class="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-lg bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                  {{ viewingQuestion.subject?.name || viewingQuestion.subjectName || "Sem matéria" }}
                </span>
                <span
                  class="rounded-lg px-3 py-1 text-xs font-bold"
                  :class="
                    viewingQuestion.difficulty === 'EASY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : viewingQuestion.difficulty === 'HARD'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  "
                >
                  {{ viewingQuestion.difficulty === 'EASY' ? 'Fácil' : (viewingQuestion.difficulty === 'HARD' ? 'Difícil' : 'Média') }}
                </span>
                <span
                  v-if="viewingQuestion.year"
                  class="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600"
                >
                  ENEM {{ viewingQuestion.year }}
                </span>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                @click="closeView"
              >
                <span class="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <!-- TÍTULO -->
            <h3
              v-if="viewingQuestion.title"
              class="mt-4 text-lg font-bold text-zinc-900"
            >
              {{ viewingQuestion.title }}
            </h3>

            <!-- ENUNCIADO -->
            <div class="mt-4 rounded-2xl bg-zinc-50/80 p-5 text-sm leading-relaxed text-zinc-800 whitespace-pre-line border border-zinc-100">
              {{ viewingQuestion.statement }}
            </div>

            <!-- IMAGENS DA QUESTÃO -->
            <div
              v-if="getQuestionImages(viewingQuestion).length > 0"
              class="mt-4 space-y-3"
            >
              <!-- IMAGEM EM DESTAQUE COM TÍTULO -->
              <div class="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 text-center space-y-2">
                <div class="inline-flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-800">
                  <span class="material-symbols-rounded text-sm">image</span>
                  <span>{{ (getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.title }}</span>
                </div>
                <div>
                  <img
                    :src="(getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.url"
                    :alt="(getQuestionImages(viewingQuestion)[activeViewingImageIndex] || getQuestionImages(viewingQuestion)[0])?.title"
                    class="max-h-80 mx-auto rounded-xl object-contain shadow-xs"
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
                  class="relative flex flex-col items-center shrink-0 overflow-hidden rounded-xl border-2 transition p-1 bg-white"
                  :class="activeViewingImageIndex === idx
                    ? 'border-purple-600 ring-2 ring-purple-600/20'
                    : 'border-zinc-200 opacity-70 hover:opacity-100'"
                  @click="activeViewingImageIndex = idx"
                >
                  <img
                    :src="img.url"
                    :alt="img.title"
                    class="h-12 w-16 object-contain bg-zinc-100 rounded-lg p-0.5"
                  />
                  <span class="mt-1 text-[10px] font-bold text-zinc-700 truncate max-w-[70px]">
                    {{ img.title || (idx + 1) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- ALTERNATIVAS -->
            <div class="mt-6 space-y-3">
              <h4 class="text-xs font-black uppercase tracking-wider text-zinc-500">
                Alternativas
              </h4>

              <div
                v-for="option in (viewingQuestion.options || viewingQuestion.alternatives || [])"
                :key="option.letter"
                class="flex items-start gap-3 rounded-2xl border p-4 transition"
                :class="
                  viewingQuestion.correctAnswer === option.letter
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 bg-white'
                "
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-extrabold text-sm"
                  :class="
                    viewingQuestion.correctAnswer === option.letter
                      ? 'bg-emerald-600 text-white'
                      : 'border border-zinc-300 bg-zinc-100 text-zinc-700'
                  "
                >
                  {{ option.letter }}
                </span>

                <div class="flex-1 text-sm text-zinc-800 leading-relaxed pt-1 space-y-2">
                  <div v-if="option.text || option.content">
                    {{ option.text || option.content }}
                  </div>
                  <div v-if="option.imageUrl" class="pt-1">
                    <img
                      :src="option.imageUrl"
                      alt="Imagem da alternativa"
                      class="max-h-48 rounded-xl border border-zinc-200 bg-zinc-50 p-1 object-contain"
                    />
                  </div>
                  <div v-if="!option.text && !option.content && !option.imageUrl" class="text-zinc-400 italic">
                    (Sem conteúdo)
                  </div>
                </div>

                <span
                  v-if="viewingQuestion.correctAnswer === option.letter"
                  class="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg"
                >
                  <span class="material-symbols-rounded text-sm">check</span>
                  Gabarito
                </span>
              </div>
            </div>

            <!-- RESOLUÇÃO COMENTADA -->
            <div
              v-if="viewingQuestion.explanation"
              class="mt-6 rounded-2xl border border-purple-100 bg-purple-50/50 p-5"
            >
              <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-800">
                <span class="material-symbols-rounded text-base">lightbulb</span>
                <span>Resolução comentada</span>
              </div>
              <p class="mt-2 text-sm leading-relaxed text-purple-950 whitespace-pre-line">
                {{ viewingQuestion.explanation }}
              </p>
            </div>

            <!-- MODAL ACTIONS -->
            <div class="mt-8 flex justify-end gap-3 border-t border-zinc-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                @click="closeView"
              >
                Fechar
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
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

    <!-- MODAL DE EXCLUSÃO -->
    <DeleteQuestion
      v-if="deletingQuestionId"
      :id="deletingQuestionId"
      :model-value="showDeleteModal"
      hide-trigger
      @deleted="handleDeleted"
      @close="showDeleteModal = false; deletingQuestionId = null"
    />
  </div>
</template>