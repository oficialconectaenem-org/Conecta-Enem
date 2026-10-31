<script setup>
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
    case 'GRADED':
      return {
        label: 'Corrigida',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      }
    case 'CORRECTING':
      return {
        label: 'Em Correção',
        bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
      }
    default:
      return {
        label: 'Pendente',
        bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      }
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadEssays()
  }, 400)
}

watch([selectedStatus, selectedClassroom], () => {
  loadEssays()
})

onMounted(() => {
  const route = useRoute()
  if (route.query.status) {
    selectedStatus.value = String(route.query.status)
  }
  loadEssays()
})
</script>

<template>
  <div class="space-y-6">
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

    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight dark:text-zinc-100">
          Redações das Turmas
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          Gerencie e corrija redações digitadas e fotos manuscritas enviadas pelos alunos.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="loadEssays"
          class="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-base">refresh</span>
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <!-- Cards de Status e Métricas Rápidas -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <button
        type="button"
        @click="selectedStatus = ''"
        class="rounded-3xl border p-4 sm:p-5 text-left transition cursor-pointer"
        :class="selectedStatus === '' ? 'border-purple-500 bg-purple-50/50 shadow-xs dark:bg-purple-950/40 dark:border-purple-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Todas</span>
          <span class="material-symbols-rounded text-lg text-purple-600 dark:text-purple-400">description</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.total }}</p>
      </button>

      <button
        type="button"
        @click="selectedStatus = 'PENDING'"
        class="rounded-3xl border p-4 sm:p-5 text-left transition cursor-pointer"
        :class="selectedStatus === 'PENDING' ? 'border-amber-500 bg-amber-50/50 shadow-xs dark:bg-amber-950/40 dark:border-amber-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendentes</span>
          <span class="material-symbols-rounded text-lg text-amber-600 dark:text-amber-400">pending</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.pending }}</p>
      </button>

      <button
        type="button"
        @click="selectedStatus = 'GRADED'"
        class="rounded-3xl border p-4 sm:p-5 text-left transition cursor-pointer"
        :class="selectedStatus === 'GRADED' ? 'border-emerald-500 bg-emerald-50/50 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Corrigidas</span>
          <span class="material-symbols-rounded text-lg text-emerald-600 dark:text-emerald-400">check_circle</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ stats.graded }}</p>
      </button>

      <div class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Turmas</span>
          <span class="material-symbols-rounded text-lg text-blue-600 dark:text-blue-400">groups</span>
        </div>
        <p class="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-100">{{ classrooms.length }}</p>
      </div>
    </div>

    <!-- Barra de Filtros e Busca -->
    <div class="flex flex-col sm:flex-row gap-3">
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

    <!-- LISTAGEM DE REDAÇÕES -->
    <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="p-6 space-y-4 animate-pulse">
        <div v-for="n in 3" :key="n" class="h-20 rounded-2xl bg-slate-100 dark:bg-zinc-800"></div>
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

      <div v-else>
        <!-- 1. TABELA DESKTOP (hidden sm:block) -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-800">
              <tr>
                <th class="py-4 px-6">Aluno</th>
                <th class="py-4 px-6">Tema da Redação</th>
                <th class="py-4 px-6">Turma</th>
                <th class="py-4 px-6">Data de Envio</th>
                <th class="py-4 px-6">Nota / Status</th>
                <th class="py-4 px-6 text-right">Ação</th>
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

                <!-- Tema & Formato (Foto vs Texto) -->
                <td class="py-4 px-6 max-w-xs">
                  <div class="flex items-center gap-1.5 mb-1">
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                      :class="essay.submissionType === 'IMAGE' || essay.imageUrl ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'"
                    >
                      <span class="material-symbols-rounded text-xs">{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'photo_camera' : 'edit_document' }}</span>
                      <span>{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'Foto Manuscrita' : 'Digitada' }}</span>
                    </span>
                  </div>
                  <p class="font-bold text-slate-800 line-clamp-1 text-xs dark:text-zinc-200" :title="essay.theme">
                    {{ essay.theme || essay.title || 'Tema não especificado' }}
                  </p>
                </td>

                <!-- Turma -->
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg text-[11px] dark:bg-purple-950/50 dark:text-purple-300">
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
                    <span class="font-black text-emerald-700 text-sm bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400">
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

                <!-- Ação -->
                <td class="py-4 px-6 text-right">
                  <button
                    type="button"
                    @click="openCorrection(essay)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-98"
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

        <!-- 2. CARDS RESPONSIVOS PARA MOBILE (sm:hidden) -->
        <div class="sm:hidden divide-y divide-slate-100 dark:divide-zinc-800 p-3 space-y-3">
          <div
            v-for="essay in essays"
            :key="essay.id"
            class="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700 text-xs shrink-0 dark:bg-purple-950/70 dark:text-purple-300">
                  {{ (essay.student?.name || 'A').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <h4 class="font-bold text-slate-900 text-xs dark:text-zinc-100">{{ essay.student?.name }}</h4>
                  <span class="text-[10px] text-purple-600 font-semibold dark:text-purple-400">{{ essay.classroom?.name || 'Sem turma' }}</span>
                </div>
              </div>

              <!-- Status Pill -->
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                :class="getStatusBadge(essay.status).bg"
              >
                {{ essay.status === 'GRADED' && essay.correction ? `${essay.correction.totalScore} pts` : getStatusBadge(essay.status).label }}
              </span>
            </div>

            <!-- Tema e Formato -->
            <div>
              <p class="text-xs font-semibold text-slate-800 dark:text-zinc-200 line-clamp-2">
                {{ essay.theme || essay.title || 'Tema da Redação' }}
              </p>
              <div class="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span
                  class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  :class="essay.submissionType === 'IMAGE' || essay.imageUrl ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'"
                >
                  <span class="material-symbols-rounded text-xs">{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'photo_camera' : 'edit_document' }}</span>
                  <span>{{ essay.submissionType === 'IMAGE' || essay.imageUrl ? 'Foto Manuscrita' : 'Digitada' }}</span>
                </span>
                <span>{{ formatDate(essay.createdAt) }}</span>
              </div>
            </div>

            <!-- Botão de Ação Full Width no Mobile -->
            <button
              type="button"
              @click="openCorrection(essay)"
              class="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 shadow-sm"
              :class="essay.status === 'GRADED' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-600/20'"
            >
              <span class="material-symbols-rounded text-sm">
                {{ essay.status === 'GRADED' ? 'edit' : 'rate_review' }}
              </span>
              <span>{{ essay.status === 'GRADED' ? 'Editar Nota' : 'Avaliar Redação' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
