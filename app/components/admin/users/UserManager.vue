<script setup>
const loading = ref(true)
const searchUser = ref('')
const activeRoleFilter = ref('ALL') // 'ALL', 'STUDENT', 'TEACHER'
const users = ref([])
const error = ref('')
const successMessage = ref('')
const deletingId = ref(null)
const userToDelete = ref(null)
const showDeleteModal = ref(false)

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/admin/users', { credentials: 'include' })
    if (res?.users) {
      users.value = res.users
    }
  } catch (err) {
    error.value = 'Erro ao carregar lista de usuários.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  let list = users.value

  if (activeRoleFilter.value !== 'ALL') {
    list = list.filter(u => u.role === activeRoleFilter.value)
  }

  if (searchUser.value.trim()) {
    const q = searchUser.value.toLowerCase()
    list = list.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    )
  }

  return list
})

const studentCount = computed(() => users.value.filter(u => u.role === 'STUDENT').length)
const teacherCount = computed(() => users.value.filter(u => u.role === 'TEACHER').length)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function promptDelete(user) {
  userToDelete.value = user
  showDeleteModal.value = true
}

function cancelDelete() {
  userToDelete.value = null
  showDeleteModal.value = false
}

async function confirmDelete() {
  if (!userToDelete.value) return

  deletingId.value = userToDelete.value.id
  error.value = ''
  successMessage.value = ''

  try {
    const res = await $fetch(`/api/admin/users/${userToDelete.value.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    successMessage.value = res.message || 'Usuário excluído com sucesso.'
    users.value = users.value.filter(u => u.id !== userToDelete.value.id)
    showDeleteModal.value = false
    userToDelete.value = null

    setTimeout(() => {
      successMessage.value = ''
    }, 4000)
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Erro ao excluir usuário.'
    console.error(err)
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- CABEÇALHO -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
          <span class="material-symbols-rounded text-purple-600 text-3xl">manage_accounts</span>
          Gerenciamento de Usuários
        </h1>
        <p class="text-xs sm:text-sm text-zinc-500 mt-1">
          Acompanhe, filtre e gerencie todos os alunos e professores cadastrados na plataforma.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="fetchUsers"
          class="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': loading }">sync</span>
          Atualizar
        </button>
      </div>
    </div>

    <!-- MENSAGENS DE STATUS -->
    <div
      v-if="successMessage"
      class="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-fadeIn"
    >
      <span class="material-symbols-rounded text-emerald-600 text-lg">check_circle</span>
      {{ successMessage }}
    </div>

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 animate-fadeIn"
    >
      <span class="material-symbols-rounded text-red-600 text-lg">error</span>
      {{ error }}
    </div>

    <!-- CARDS DE ESTATÍSTICAS E ABAS DE FILTRO -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        type="button"
        @click="activeRoleFilter = 'ALL'"
        class="group flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5"
        :class="activeRoleFilter === 'ALL' ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 shadow-xs' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs'"
      >
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold transition-transform group-hover:scale-110">
            <span class="material-symbols-rounded">groups</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Todos</div>
            <div class="text-2xl font-black text-zinc-900">{{ users.length }}</div>
          </div>
        </div>
        <span v-if="activeRoleFilter === 'ALL'" class="material-symbols-rounded text-purple-600 text-lg">check_circle</span>
      </button>

      <button
        type="button"
        @click="activeRoleFilter = 'STUDENT'"
        class="group flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5"
        :class="activeRoleFilter === 'STUDENT' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs'"
      >
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold transition-transform group-hover:scale-110">
            <span class="material-symbols-rounded">school</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Alunos</div>
            <div class="text-2xl font-black text-zinc-900">{{ studentCount }}</div>
          </div>
        </div>
        <span v-if="activeRoleFilter === 'STUDENT'" class="material-symbols-rounded text-emerald-600 text-lg">check_circle</span>
      </button>

      <button
        type="button"
        @click="activeRoleFilter = 'TEACHER'"
        class="group flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5"
        :class="activeRoleFilter === 'TEACHER' ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-xs' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-xs'"
      >
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold transition-transform group-hover:scale-110">
            <span class="material-symbols-rounded">cast_for_education</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Professores</div>
            <div class="text-2xl font-black text-zinc-900">{{ teacherCount }}</div>
          </div>
        </div>
        <span v-if="activeRoleFilter === 'TEACHER'" class="material-symbols-rounded text-indigo-600 text-lg">check_circle</span>
      </button>
    </div>

    <!-- BARRA DE BUSCA -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <span class="material-symbols-rounded absolute left-3.5 top-2.5 text-zinc-400 text-lg">search</span>
        <input
          v-model="searchUser"
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          class="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-purple-600 transition"
        />
      </div>
      <div class="text-xs text-zinc-500 font-medium">
        Mostrando <b class="text-zinc-800">{{ filteredUsers.length }}</b> usuário(s)
      </div>
    </div>

    <!-- ESTADO CARREGANDO -->
    <div v-if="loading" class="py-16 text-center">
      <span class="material-symbols-rounded animate-spin text-3xl text-purple-600">progress_activity</span>
      <p class="mt-2 text-xs font-bold text-zinc-500">Carregando usuários...</p>
    </div>

    <!-- ESTADO VAZIO -->
    <div v-else-if="filteredUsers.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-12 text-center space-y-2">
      <span class="material-symbols-rounded text-4xl text-zinc-400">person_off</span>
      <h3 class="text-sm font-bold text-zinc-800">Nenhum usuário encontrado</h3>
      <p class="text-xs text-zinc-500">Nenhum registro corresponde aos filtros selecionados.</p>
    </div>

    <!-- TABELA DE USUÁRIOS -->
    <div v-else class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-zinc-200 text-left text-xs">
          <thead class="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500">
            <tr>
              <th class="px-5 py-3.5">Usuário</th>
              <th class="px-5 py-3.5">Tipo</th>
              <th class="px-5 py-3.5">Turmas / Detalhes</th>
              <th class="px-5 py-3.5">Atividade</th>
              <th class="px-5 py-3.5">Status</th>
              <th class="px-5 py-3.5">Cadastro</th>
              <th class="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-zinc-50/80 transition">
              <!-- DADOS BÁSICOS -->
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black uppercase"
                    :class="u.role === 'TEACHER' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'"
                  >
                    {{ u.name ? u.name.charAt(0) : 'U' }}
                  </div>
                  <div>
                    <div class="font-bold text-zinc-900">{{ u.name }}</div>
                    <div class="text-[11px] text-zinc-400">{{ u.email }}</div>
                  </div>
                </div>
              </td>

              <!-- PAPEL / ROLE -->
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="u.role === 'TEACHER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                >
                  <span class="material-symbols-rounded text-xs">
                    {{ u.role === 'TEACHER' ? 'cast_for_education' : 'school' }}
                  </span>
                  {{ u.role === 'TEACHER' ? 'Professor' : 'Aluno' }}
                </span>
              </td>

              <!-- TURMAS / DETALHES -->
              <td class="px-5 py-4">
                <!-- ALUNO -->
                <div v-if="u.role === 'STUDENT'">
                  <div v-if="u.classrooms && u.classrooms.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="c in u.classrooms"
                      :key="c.id"
                      class="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
                    >
                      {{ c.name }} <span class="text-zinc-400">({{ c.teacherName }})</span>
                    </span>
                  </div>
                  <span v-else class="text-zinc-400 italic">Sem turma vinculada</span>
                </div>

                <!-- PROFESSOR -->
                <div v-else-if="u.role === 'TEACHER'">
                  <div v-if="u.classrooms && u.classrooms.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="c in u.classrooms"
                      :key="c.id"
                      class="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-800"
                    >
                      {{ c.name }} ({{ c.studentsCount }} alunos)
                    </span>
                  </div>
                  <span v-else class="text-zinc-400 italic">Nenhuma turma criada</span>
                </div>
              </td>

              <!-- ATIVIDADE -->
              <td class="px-5 py-4 text-zinc-600">
                <div v-if="u.role === 'STUDENT'">
                  <span class="font-bold text-zinc-900">{{ u.essaysCount }}</span> redações enviadas
                </div>
                <div v-else-if="u.role === 'TEACHER'">
                  <span class="font-bold text-zinc-900">{{ u.gradedCount }}</span> correções feitas
                </div>
              </td>

              <!-- STATUS -->
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
                >
                  {{ u.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>

              <!-- DATA -->
              <td class="px-5 py-4 text-zinc-500">
                {{ formatDate(u.createdAt) }}
              </td>

              <!-- AÇÕES (DELETAR) -->
              <td class="px-5 py-4 text-right">
                <button
                  type="button"
                  @click="promptDelete(u)"
                  class="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Excluir usuário"
                >
                  <span class="material-symbols-rounded text-lg">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4 animate-scaleUp">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <span class="material-symbols-rounded text-2xl">warning</span>
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Excluir Usuário</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Esta ação não pode ser desfeita.</p>
          </div>
        </div>

        <p class="text-xs text-zinc-600 leading-relaxed">
          Tem certeza de que deseja excluir permanentemente o {{ userToDelete?.role === 'TEACHER' ? 'professor' : 'aluno' }}
          <strong class="text-zinc-900">{{ userToDelete?.name }}</strong> ({{ userToDelete?.email }})?
          Todos os dados vinculados, turmas e submissões serão removidos.
        </p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="cancelDelete"
            class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="confirmDelete"
            :disabled="Boolean(deletingId)"
            class="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <span v-if="deletingId" class="material-symbols-rounded animate-spin text-sm">progress_activity</span>
            <span class="material-symbols-rounded text-sm" v-else>delete</span>
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

.animate-scaleUp {
  animation: scaleUp 0.15s ease-out forwards;
}
</style>
