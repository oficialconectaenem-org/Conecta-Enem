<script setup>
const adminNavigation = inject('adminNavigation', null)

const loading = ref(true)
const stats = ref({
  totalStudents: 0,
  totalTeachers: 0,
  totalQuestions: 0,
  totalSubjects: 0,
  totalModules: 0,
  totalLessons: 0,
  totalEssays: 0
})
const recentStudents = ref([])
const recentEssays = ref([])

async function fetchDashboardStats() {
  loading.value = true
  try {
    const res = await $fetch('/api/admin/dashboard', { credentials: 'include' })
    if (res?.stats) {
      stats.value = res.stats
      recentStudents.value = res.recentStudents || []
      recentEssays.value = res.recentEssays || []
    }
  } catch (err) {
    console.error('Erro ao carregar estatísticas do admin:', err)
  } finally {
    loading.value = false
  }
}

function goTo(section) {
  if (adminNavigation) {
    adminNavigation.changeSection(section)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
}

onMounted(() => {
  fetchDashboardStats()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
        Painel de Administração
      </h1>
      <p class="mt-1 text-xs sm:text-sm text-zinc-500">
        Visão geral e métricas em tempo real da plataforma Conecta Enem.
      </p>
    </div>

    <!-- CARDS DE ESTATÍSTICAS REAIS -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- ALUNOS -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-purple-300 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/usuarios')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Estudantes</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 group-hover:text-purple-600 transition">{{ stats.totalStudents }}</span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-200">
          <span class="material-symbols-rounded text-2xl">school</span>
        </div>
      </div>

      <!-- BANCO DE QUESTÕES -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/questoes')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Questões ENEM</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 group-hover:text-blue-600 transition">{{ stats.totalQuestions }}</span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
          <span class="material-symbols-rounded text-2xl">quiz</span>
        </div>
      </div>

      <!-- MATÉRIAS & MÓDULOS -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/materias')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Matérias</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 group-hover:text-emerald-600 transition">{{ stats.totalSubjects }}</span>
          <span class="text-[11px] text-zinc-400 block font-medium">{{ stats.totalModules }} módulos / {{ stats.totalLessons }} aulas</span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
          <span class="material-symbols-rounded text-2xl">menu_book</span>
        </div>
      </div>

      <!-- REDAÇÕES -->
      <div class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md">
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Redações Enviadas</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 group-hover:text-indigo-600 transition">{{ stats.totalEssays }}</span>
          <span class="text-[11px] text-zinc-400 block font-medium">{{ stats.totalTeachers }} professores ativos</span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
          <span class="material-symbols-rounded text-2xl">edit_note</span>
        </div>
      </div>
    </div>

    <!-- ATALHOS RÁPIDOS DE GERENCIAMENTO -->
    <div class="space-y-3 pt-2">
      <h2 class="text-xs font-black uppercase tracking-wider text-zinc-400">
        Gestão Rápida
      </h2>

      <div class="grid gap-3 sm:grid-cols-3">
        <NuxtLink
          to="/admin/questoes"
          class="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-400 hover:shadow-md cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 transition-transform group-hover:scale-110">
              <span class="material-symbols-rounded text-xl">quiz</span>
            </div>
            <div>
              <h3 class="text-xs font-bold text-zinc-900 group-hover:text-purple-600 transition">Banco de Questões</h3>
              <p class="text-[11px] text-zinc-400">Cadastrar e revisar questões</p>
            </div>
          </div>
          <span class="material-symbols-rounded text-zinc-400 group-hover:text-purple-600 group-hover:translate-x-1 transition text-lg">chevron_right</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/materias"
          class="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-transform group-hover:scale-110">
              <span class="material-symbols-rounded text-xl">menu_book</span>
            </div>
            <div>
              <h3 class="text-xs font-bold text-zinc-900 group-hover:text-blue-600 transition">Matérias & Módulos</h3>
              <p class="text-[11px] text-zinc-400">Disciplinas e cronogramas</p>
            </div>
          </div>
          <span class="material-symbols-rounded text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition text-lg">chevron_right</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/usuarios"
          class="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
              <span class="material-symbols-rounded text-xl">manage_accounts</span>
            </div>
            <div>
              <h3 class="text-xs font-bold text-zinc-900 group-hover:text-emerald-600 transition">Usuários Cadastrados</h3>
              <p class="text-[11px] text-zinc-400">Ver alunos, professores e gerenciar</p>
            </div>
          </div>
          <span class="material-symbols-rounded text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition text-lg">chevron_right</span>
        </NuxtLink>
      </div>
    </div>

    <!-- LISTAS RECENTES (ÚLTIMOS ALUNOS E REDAÇÕES) -->
    <div class="grid gap-6 lg:grid-cols-2 pt-2">
      <!-- ÚLTIMOS ALUNOS CADASTRADOS -->
      <div class="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
        <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-purple-600">group</span>
            <h3 class="text-sm font-black text-zinc-900">Últimos Alunos</h3>
          </div>
          <button
            type="button"
            @click="navigateTo('/admin/usuarios')"
            class="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
          >
            Ver todos
          </button>
        </div>

        <div v-if="loading" class="py-6 text-center text-xs text-zinc-400">
          Carregando alunos...
        </div>

        <div v-else-if="recentStudents.length === 0" class="py-6 text-center text-xs text-zinc-400">
          Nenhum aluno cadastrado.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="st in recentStudents"
            :key="st.id"
            class="flex items-center justify-between text-xs"
          >
            <div class="space-y-0.5">
              <p class="font-bold text-zinc-900">{{ st.name }}</p>
              <p class="text-[11px] text-zinc-400">{{ st.email }}</p>
            </div>
            <span class="text-[11px] text-zinc-400 font-medium">
              {{ formatDate(st.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ÚLTIMAS REDAÇÕES ENVIADAS -->
      <div class="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
        <div class="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-purple-600">edit_note</span>
            <h3 class="text-sm font-black text-zinc-900">Atividade de Redações</h3>
          </div>
        </div>

        <div v-if="loading" class="py-6 text-center text-xs text-zinc-400">
          Carregando redações...
        </div>

        <div v-else-if="recentEssays.length === 0" class="py-6 text-center text-xs text-zinc-400">
          Nenhuma redação enviada até o momento.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="es in recentEssays"
            :key="es.id"
            class="flex items-center justify-between text-xs"
          >
            <div class="space-y-0.5 min-w-0 pr-3">
              <p class="font-bold text-zinc-900 truncate">{{ es.title || es.theme }}</p>
              <p class="text-[11px] text-zinc-400">{{ es.student?.name || 'Aluno' }} • {{ es.classroom?.name || 'Individual' }}</p>
            </div>

            <div class="text-right shrink-0">
              <span
                class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                :class="es.status === 'GRADED' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'"
              >
                {{ es.status === 'GRADED' ? `${es.correction?.totalScore || 0} pts` : 'Pendente' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
