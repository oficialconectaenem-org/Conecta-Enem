<script setup>
import GradeEssayModal from '~/components/professor/GradeEssayModal.vue'

definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

useSeoMeta({
  title: 'Redações Recebidas — Painel do Professor | Conecta Enem'
})

const loading = ref(true)
const essays = ref([])
const classrooms = ref([])
const stats = ref({
  total: 0,
  pending: 0,
  correcting: 0,
  graded: 0
})

// Filtros
const selectedStatus = ref('')
const selectedClassroom = ref('')
const searchQuery = ref('')

// Modal de Correção
const selectedEssay = ref(null)
const showGradeModal = ref(false)
const savingCorrection = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

function showToast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

async function loadEssays() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (selectedClassroom.value) params.append('classroomId', selectedClassroom.value)
    if (searchQuery.value.trim()) params.append('search', searchQuery.value.trim())

    const res = await $fetch(`/api/teacher/essays?${params.toString()}`, {
      credentials: 'include'
    })

    if (res?.success) {
      essays.value = res.essays || []
      classrooms.value = res.classrooms || []
      stats.value = res.stats || stats.value
    }
  } catch (err) {
    showToast('Erro ao carregar lista de redações.', 'error')
  } finally {
    loading.value = false
  }
}

function openCorrection(essay) {
  navigateTo(`/professor/redacoes/${essay.id}`)
}

async function handleSaveGrade(data) {
  if (!selectedEssay.value) return

  savingCorrection.value = true
  try {
    await $fetch(`/api/teacher/essays/${selectedEssay.value.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: data
    })

    showGradeModal.value = false
    showToast('Redação avaliada e nota publicada com sucesso!', 'success')
    await loadEssays()
  } catch (err) {
    showToast(err.data?.message || 'Erro ao salvar avaliação.', 'error')
  } finally {
    savingCorrection.value = false
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusBadge(status) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pendente', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' }
    case 'CORRECTING':
      return { label: 'Em Análise', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60' }
    case 'GRADED':
      return { label: 'Corrigida', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' }
    default:
      return { label: status, bg: 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700' }
  }
}

// Observar filtros com debounce simples
let searchTimeout = null
watch([selectedStatus, selectedClassroom], () => {
  loadEssays()
})

function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadEssays()
  }, 400)
}

onMounted(() => {
  loadEssays()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Toast Feedback -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-xl transition-all"
        :class="toastType === 'error' ? 'bg-red-600' : 'bg-emerald-600'"
      >
        <span class="material-symbols-rounded text-base">
          {{ toastType === 'error' ? 'error' : 'check_circle' }}
        </span>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Header Principal -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight dark:text-zinc-100">
          Redações dos Alunos
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Todas as redações enviadas pelas suas turmas, organizadas por status e competências ENEM.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadEssays"
          class="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
          title="Atualizar lista"
        >
          <span class="material-symbols-rounded text-lg">refresh</span>
        </button>
      </div>
    </div>

    <!-- Cards de Filtros Rápidos / Estatísticas -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <button
        type="button"
        @click="selectedStatus = ''"
        class="rounded-3xl border p-5 text-left transition"
        :class="selectedStatus === '' ? 'border-purple-600 bg-purple-50/50 shadow-xs dark:bg-purple-950/40 dark:border-purple-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Todas</span>
          <span class="material-symbols-rounded text-lg text-purple-600 dark:text-purple-400">article</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.total }}</p>
      </button>

      <button
        type="button"
        @click="selectedStatus = 'PENDING'"
        class="rounded-3xl border p-5 text-left transition"
        :class="selectedStatus === 'PENDING' ? 'border-amber-500 bg-amber-50/50 shadow-xs dark:bg-amber-950/40 dark:border-amber-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendentes</span>
          <span class="material-symbols-rounded text-lg text-amber-600 dark:text-amber-400">hourglass_top</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.pending }}</p>
      </button>

      <button
        type="button"
        @click="selectedStatus = 'GRADED'"
        class="rounded-3xl border p-5 text-left transition"
        :class="selectedStatus === 'GRADED' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Corrigidas</span>
          <span class="material-symbols-rounded text-lg text-emerald-600 dark:text-emerald-400">check_circle</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.graded }}</p>
      </button>

      <div class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Turmas</span>
          <span class="material-symbols-rounded text-lg text-blue-600 dark:text-blue-400">groups</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ classrooms.length }}</p>
      </div>
    </div>

    <!-- Barra de Filtros e Busca -->
    <div class="flex flex-col sm:flex-row gap-3">
      <!-- Busca por texto ou nome do aluno -->
      <div class="relative flex-1">
        <span class="material-symbols-rounded absolute left-3.5 top-3 text-slate-400 dark:text-zinc-500 text-lg">search</span>
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          placeholder="Buscar por tema, título ou nome do aluno..."
          class="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      <!-- Filtro por Turma -->
      <select
        v-model="selectedClassroom"
        class="h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs text-slate-700 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition font-medium dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="">Todas as turmas</option>
        <option v-for="c in classrooms" :key="c.id" :value="c.id">
          {{ c.name }} (#{{ c.code }})
        </option>
      </select>
    </div>

    <!-- Listagem Principal de Redações -->
    <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <!-- Skeleton Loading -->
      <div v-if="loading" class="p-6 space-y-4 animate-pulse">
        <div v-for="n in 4" :key="n" class="h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800"></div>
      </div>

      <!-- Estado Vazio -->
      <div v-else-if="essays.length === 0" class="p-12 text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-purple-50 text-purple-600 mb-3 dark:bg-purple-950/50 dark:text-purple-400">
          <span class="material-symbols-rounded text-3xl">inbox</span>
        </div>
        <h3 class="text-base font-black text-slate-900 dark:text-zinc-100">Nenhuma redação encontrada</h3>
        <p class="mt-1 text-xs text-slate-500 max-w-sm mx-auto dark:text-zinc-400">
          Assim que seus alunos submeterem redações através das turmas, elas aparecerão listadas aqui para você corrigir.
        </p>
      </div>

      <!-- Tabela / Lista de Redações -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-800">
            <tr>
              <th class="py-4 px-6">Aluno</th>
              <th class="py-4 px-6">Tema da Redação</th>
              <th class="py-4 px-6">Turma</th>
              <th class="py-4 px-6">Data de Envio</th>
              <th class="py-4 px-6">Nota / Status</th>
              <th class="py-4 px-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-zinc-800">
            <tr
              v-for="essay in essays"
              :key="essay.id"
              class="hover:bg-slate-50/75 dark:hover:bg-zinc-800/40 transition"
            >
              <!-- Aluno -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700 text-xs shrink-0 dark:bg-purple-950/70 dark:text-purple-300">
                    {{ (essay.student?.name || 'A').slice(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm dark:text-zinc-100">{{ essay.student?.name }}</p>
                    <p class="text-[11px] text-slate-400 dark:text-zinc-500">{{ essay.student?.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Tema -->
              <td class="py-4 px-6 max-w-xs">
                <div class="flex items-center gap-1.5 mb-1">
                  <span
                    class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    :class="essay.submissionType === 'IMAGE' || essay.imageUrl ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'"
                  >
                    <span class="material-symbols-rounded text-[13px]">{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'photo_camera' : 'keyboard' }}</span>
                    <span>{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'Foto Manuscrita' : 'Digitada' }}</span>
                  </span>
                </div>
                <p class="font-bold text-slate-800 line-clamp-1 text-xs dark:text-zinc-200" :title="essay.theme">
                  {{ essay.theme }}
                </p>
                <p v-if="essay.title" class="text-[11px] text-slate-400 italic line-clamp-1 dark:text-zinc-500">
                  "{{ essay.title }}"
                </p>
              </td>

              <!-- Turma -->
              <td class="py-4 px-6">
                <span class="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg text-[11px] dark:bg-purple-950/50 dark:text-purple-300">
                  {{ essay.classroom?.name || 'Sem turma' }}
                </span>
              </td>

              <!-- Data -->
              <td class="py-4 px-6 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                {{ formatDate(essay.createdAt) }}
              </td>

              <!-- Status / Nota -->
              <td class="py-4 px-6 whitespace-nowrap">
                <div v-if="essay.status === 'GRADED' && essay.correction" class="flex items-center gap-2">
                  <span class="font-black text-emerald-700 text-sm bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400">
                    {{ essay.correction.totalScore }} / 1000
                  </span>
                </div>
                <div v-else>
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                    :class="getStatusBadge(essay.status).bg"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="essay.status === 'PENDING' ? 'bg-amber-500' : 'bg-blue-500'"></span>
                    {{ getStatusBadge(essay.status).label }}
                  </span>
                </div>
              </td>

              <!-- Ação de Corrigir -->
              <td class="py-4 px-6 text-right">
                <button
                  type="button"
                  @click="openCorrection(essay)"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition"
                  :class="essay.status === 'GRADED' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20'"
                >
                  <span class="material-symbols-rounded text-sm">
                    {{ essay.status === 'GRADED' ? 'edit' : 'rate_review' }}
                  </span>
                  <span>{{ essay.status === 'GRADED' ? 'Editar Nota' : 'Avaliar' }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Completo de Avaliação por Competência ENEM -->
    <GradeEssayModal
      :show="showGradeModal"
      :essay="selectedEssay"
      :saving="savingCorrection"
      @close="showGradeModal = false"
      @save="handleSaveGrade"
    />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
