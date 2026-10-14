<script setup>
import { useAuthStore } from '~/stores/auth'
import { useTeacherClassrooms } from '~/composables/useTeacherClassrooms'
import ClassroomCard from '~/components/professor/ClassroomCard.vue'
import CreateClassroomModal from '~/components/professor/CreateClassroomModal.vue'

definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

useSeoMeta({
  title: 'Painel do Professor — Conecta Enem'
})

const authStore = useAuthStore()
const { getClassrooms, createClassroom, deleteClassroom } = useTeacherClassrooms()

const teacherName = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return 'Professor'
  const clean = name.replace(/^(Prof\.?|Professor(a)?)\s+/i, '')
  return clean.split(/\s+/)[0] || name
})

const loading = ref(true)
const creating = ref(false)
const showModal = ref(false)
const classrooms = ref([])
const recentStudents = ref([])
const toastMessage = ref('')
const toastType = ref('success')

function showToast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

async function loadData() {
  loading.value = true
  try {
    const [classroomsRes, dashRes] = await Promise.allSettled([
      getClassrooms(),
      $fetch('/api/teacher/dashboard', { credentials: 'include' })
    ])

    if (classroomsRes.status === 'fulfilled' && classroomsRes.value?.classrooms) {
      classrooms.value = classroomsRes.value.classrooms
    }

    if (dashRes.status === 'fulfilled' && dashRes.value?.recentStudents) {
      recentStudents.value = dashRes.value.recentStudents
    }
  } catch (err) {
    showToast('Não foi possível carregar as informações.', 'error')
  } finally {
    loading.value = false
  }
}

async function handleCreate(formData) {
  creating.value = true
  try {
    await createClassroom(formData)
    showModal.value = false
    showToast('Turma criada com sucesso!', 'success')
    await loadData()
  } catch (err) {
    showToast(err.data?.message || 'Erro ao criar turma.', 'error')
  } finally {
    creating.value = false
  }
}

async function handleDelete(classroom) {
  const confirmed = confirm(`Tem certeza que deseja excluir a turma "${classroom.name}"? Todos os vínculos com alunos serão removidos.`)
  if (!confirmed) return

  try {
    await deleteClassroom(classroom.id)
    showToast('Turma excluída com sucesso.', 'success')
    await loadData()
  } catch (err) {
    showToast(err.data?.message || 'Erro ao excluir turma.', 'error')
  }
}

const totalStudents = computed(() => {
  return classrooms.value.reduce((acc, c) => acc + (c.studentsCount || 0), 0)
})

const activeClassroomsCount = computed(() => {
  return classrooms.value.filter(c => !c.isExpired && c.active).length
})

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

onMounted(() => {
  loadData()
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

    <!-- BANNER DE BOAS-VINDAS COM AÇÃO DIRETA -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10">
      <div class="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
      <div class="pointer-events-none absolute right-1/4 -bottom-12 h-40 w-40 rounded-full bg-indigo-900/30 blur-2xl"></div>

      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md">
            <span class="material-symbols-rounded text-sm text-purple-200">waving_hand</span>
            Área do Docente
          </span>
          <h1 class="mt-3 text-2xl sm:text-3xl font-black tracking-tight">
            Olá, Prof. {{ teacherName }}!
          </h1>
          <p class="mt-1 text-xs sm:text-sm text-purple-100 max-w-xl">
            Acompanhe suas turmas ativas, convide estudantes e gerencie suas atividades em um só lugar.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="showModal = true"
            class="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-purple-700 shadow-lg shadow-black/10 hover:bg-purple-50 transition active:scale-98"
          >
            <span class="material-symbols-rounded text-lg">add_circle</span>
            <span>Criar Nova Turma</span>
          </button>
        </div>
      </div>
    </div>

    <!-- CARDS DE MÉTRICAS GERAIS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total de Turmas</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <span class="material-symbols-rounded text-xl">school</span>
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900 dark:text-zinc-100">
          {{ loading ? '...' : classrooms.length }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
          <span class="material-symbols-rounded text-xs text-purple-500">folder_open</span>
          Turmas cadastradas
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Turmas Ativas</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span class="material-symbols-rounded text-xl">check_circle</span>
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900 dark:text-zinc-100">
          {{ loading ? '...' : activeClassroomsCount }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Links válidos
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total de Alunos</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <span class="material-symbols-rounded text-xl">groups</span>
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900 dark:text-zinc-100">
          {{ loading ? '...' : totalStudents }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
          <span class="material-symbols-rounded text-xs text-blue-500">person</span>
          Estudantes vinculados
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Redações para Corrigir</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <span class="material-symbols-rounded text-xl">rate_review</span>
          </div>
        </div>
        <p class="mt-3 text-3xl font-black text-slate-900 dark:text-zinc-100">0</p>
        <span class="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span class="material-symbols-rounded text-xs">hourglass_empty</span>
          Fila de avaliação
        </span>
      </div>
    </div>

    <!-- SEÇÃO PRINCIPAL UNIFICADA (TURMAS + ÚLTIMOS INSCRITOS) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Coluna Principal: Minhas Turmas -->
      <div class="lg:col-span-2 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-900 dark:text-zinc-100">Minhas Turmas</h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400">Gerencie seus links de convite e acompanhe os alunos.</p>
          </div>

          <button
            type="button"
            @click="showModal = true"
            class="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition"
          >
            <span class="material-symbols-rounded text-base">add</span>
            <span>Nova Turma</span>
          </button>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="n in 2"
            :key="n"
            class="h-64 rounded-3xl border border-slate-200 bg-white p-6 animate-pulse space-y-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="h-4 bg-slate-100 rounded w-1/3 dark:bg-zinc-800"></div>
            <div class="h-6 bg-slate-100 rounded w-3/4 dark:bg-zinc-800"></div>
            <div class="h-16 bg-slate-50 rounded-2xl dark:bg-zinc-800/60"></div>
            <div class="h-8 bg-slate-100 rounded dark:bg-zinc-800"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="classrooms.length === 0"
          class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-3 dark:bg-purple-950/50 dark:text-purple-400">
            <span class="material-symbols-rounded text-2xl">groups_3</span>
          </div>
          <h3 class="text-sm font-black text-slate-900 dark:text-zinc-100">Você ainda não tem nenhuma turma</h3>
          <p class="mt-1 text-xs text-slate-500 max-w-sm mx-auto dark:text-zinc-400">
            Crie sua primeira turma para gerar links de convite e começar a receber seus alunos.
          </p>
          <button
            type="button"
            @click="showModal = true"
            class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition active:scale-98"
          >
            <span class="material-symbols-rounded text-base">add</span>
            <span>Criar Minha Primeira Turma</span>
          </button>
        </div>

        <!-- Grid com os Cards das Turmas -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ClassroomCard
            v-for="classroom in classrooms"
            :key="classroom.id"
            :classroom="classroom"
            @delete="handleDelete"
            @copy-link="() => showToast('Link de convite copiado!', 'success')"
          />
        </div>
      </div>

      <!-- Coluna Lateral: Últimos Alunos Matriculados & Ações -->
      <div class="space-y-6">
        <!-- Card de Alunos Recentes -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h3 class="text-sm font-black text-slate-900 dark:text-zinc-100">Últimos Alunos</h3>
              <p class="text-[11px] text-slate-500 dark:text-zinc-400">Inscrições recentes via link</p>
            </div>
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <span class="material-symbols-rounded text-sm">person_add</span>
            </span>
          </div>

          <div v-if="loading" class="mt-4 space-y-3">
            <div v-for="n in 3" :key="n" class="h-10 rounded-xl bg-slate-100 animate-pulse dark:bg-zinc-800"></div>
          </div>

          <div
            v-else-if="recentStudents.length === 0"
            class="py-8 text-center"
          >
            <p class="text-xs font-semibold text-slate-500 dark:text-zinc-400">Nenhum aluno inscrito ainda</p>
            <p class="text-[10px] text-slate-400 mt-0.5 dark:text-zinc-500">Envie o código ou link da turma.</p>
          </div>

          <div v-else class="mt-4 divide-y divide-slate-100 dark:divide-zinc-800">
            <div
              v-for="student in recentStudents"
              :key="student.id"
              class="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-[11px] dark:bg-purple-950/70 dark:text-purple-300">
                  {{ (student.name || 'A').slice(0, 2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-900 truncate dark:text-zinc-100">{{ student.name }}</p>
                  <p class="text-[10px] text-purple-700 truncate font-semibold dark:text-purple-400">{{ student.classroomName }}</p>
                </div>
              </div>

              <span class="text-[10px] text-slate-400 shrink-0 font-medium dark:text-zinc-500">
                {{ formatDate(student.joinedAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Atalho Rápido para Redações -->
        <NuxtLink
          to="/professor/redacoes"
          class="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition group dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-500/50"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition dark:bg-emerald-950/50 dark:text-emerald-400">
            <span class="material-symbols-rounded text-2xl">edit_note</span>
          </div>
          <div>
            <h4 class="text-xs font-black text-slate-900 dark:text-zinc-100">Módulo de Redações</h4>
            <p class="text-[11px] text-slate-500 mt-0.5 dark:text-zinc-400">Avaliar redações enviadas</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Modal de Criação de Turma -->
    <CreateClassroomModal
      :show="showModal"
      :loading="creating"
      @close="showModal = false"
      @save="handleCreate"
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