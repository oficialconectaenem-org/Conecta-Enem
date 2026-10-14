<script setup>
const loading = ref(true)
const searchStudent = ref('')
const students = ref([])
const error = ref('')

async function fetchStudents() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/admin/students', { credentials: 'include' })
    if (res?.students) {
      students.value = res.students
    }
  } catch (err) {
    error.value = 'Erro ao carregar alunos.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const filteredStudents = computed(() => {
  if (!searchStudent.value.trim()) return students.value
  const q = searchStudent.value.toLowerCase()
  return students.value.filter(s =>
    s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  )
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

onMounted(() => {
  fetchStudents()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Alunos Cadastrados
        </h1>
        <p class="text-xs sm:text-sm text-zinc-500 mt-1">
          Gerencie e acompanhe todos os estudantes da plataforma Conecta Enem.
        </p>
      </div>

      <div class="relative w-full sm:w-72">
        <span class="material-symbols-rounded absolute left-3.5 top-2.5 text-zinc-400 text-lg">search</span>
        <input
          v-model="searchStudent"
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          class="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-purple-600 transition"
        />
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <span class="material-symbols-rounded animate-spin text-3xl text-purple-600">progress_activity</span>
      <p class="mt-2 text-xs font-bold text-zinc-500">Carregando lista de alunos...</p>
    </div>

    <div v-else-if="filteredStudents.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-12 text-center space-y-2">
      <span class="material-symbols-rounded text-4xl text-zinc-400">person_off</span>
      <h3 class="text-sm font-bold text-zinc-800">Nenhum aluno encontrado</h3>
      <p class="text-xs text-zinc-500">Nenhum estudante corresponde aos filtros aplicados.</p>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-zinc-200 text-left text-xs">
          <thead class="bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500">
            <tr>
              <th class="px-5 py-3.5">Aluno</th>
              <th class="px-5 py-3.5">Turmas Matriculadas</th>
              <th class="px-5 py-3.5">Redações Enviadas</th>
              <th class="px-5 py-3.5">Status</th>
              <th class="px-5 py-3.5">Cadastrado em</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-for="student in filteredStudents" :key="student.id" class="hover:bg-zinc-50/80 transition">
              <td class="px-5 py-4">
                <div class="font-bold text-zinc-900">{{ student.name }}</div>
                <div class="text-[11px] text-zinc-400">{{ student.email }}</div>
              </td>
              <td class="px-5 py-4">
                <div v-if="student.classrooms.length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="c in student.classrooms"
                    :key="c.id"
                    class="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100"
                  >
                    {{ c.name }} (Prof. {{ c.teacherName }})
                  </span>
                </div>
                <span v-else class="text-zinc-400 italic">Sem turma</span>
              </td>
              <td class="px-5 py-4 font-bold text-zinc-700">
                {{ student.essaysCount }}
              </td>
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="student.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
                >
                  {{ student.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-5 py-4 text-zinc-500">
                {{ formatDate(student.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
