<script setup>
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const route = useRoute()
const userId = computed(() => route.params.id)

const loading = ref(true)
const error = ref('')
const data = ref(null)

const activeTab = ref('overview') // 'overview', 'essays', 'questions', 'lessons', 'classrooms'
const questionFilter = ref('ALL') // 'ALL', 'CORRECT', 'INCORRECT'
const selectedEssay = ref(null)
const showEssayModal = ref(false)

async function fetchUserActivity() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch(`/api/admin/users/${userId.value}`, { credentials: 'include' })
    if (res?.success) {
      data.value = res
    } else {
      error.value = 'Falha ao carregar os dados do usuário.'
    }
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Erro ao consultar atividades do usuário.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const user = computed(() => data.value?.user || {})
const stats = computed(() => data.value?.stats || {})
const performanceBySubject = computed(() => data.value?.performanceBySubject || [])
const essays = computed(() => data.value?.essays || [])
const questionAnswers = computed(() => data.value?.questionAnswers || [])
const lessonProgress = computed(() => data.value?.lessonProgress || [])
const classrooms = computed(() => data.value?.classrooms || [])

const filteredQuestionAnswers = computed(() => {
  if (questionFilter.value === 'CORRECT') {
    return questionAnswers.value.filter(q => q.isCorrect)
  }
  if (questionFilter.value === 'INCORRECT') {
    return questionAnswers.value.filter(q => !q.isCorrect)
  }
  return questionAnswers.value
})

function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

function openEssayModal(essay) {
  selectedEssay.value = essay
  showEssayModal.value = true
}

useSeoMeta({
  title: computed(() => user.value.name ? `${user.value.name} — Painel de Atividades` : 'Atividades do Usuário — Conecta Enem')
})

onMounted(() => {
  fetchUserActivity()
})
</script>

<template>
  <div class="space-y-6">
    <!-- BOTÃO VOLTAR & BREADCRUMB -->
    <div class="flex items-center justify-between gap-4">
      <NuxtLink
        to="/admin/usuarios"
        class="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition"
      >
        <span class="material-symbols-rounded text-base">arrow_back</span>
        <span>Voltar para Lista de Usuários</span>
      </NuxtLink>

      <button
        type="button"
        @click="fetchUserActivity"
        :disabled="loading"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
      >
        <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': loading }">sync</span>
        <span>Atualizar Dados</span>
      </button>
    </div>

    <!-- ESTADO DE CARREGAMENTO -->
    <div v-if="loading" class="py-20 text-center space-y-3">
      <span class="material-symbols-rounded animate-spin text-4xl text-purple-600">progress_activity</span>
      <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400">Carregando histórico e atividades completas...</p>
    </div>

    <!-- ESTADO DE ERRO -->
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 text-center space-y-3"
    >
      <span class="material-symbols-rounded text-3xl text-red-600">error</span>
      <h3 class="text-sm font-bold text-red-900 dark:text-red-200">Não foi possível carregar as atividades</h3>
      <p class="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">{{ error }}</p>
      <button
        type="button"
        @click="fetchUserActivity"
        class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
      >
        Tentar Novamente
      </button>
    </div>

    <!-- CONTEÚDO PRINCIPAL DO PERFIL -->
    <div v-else-if="data" class="space-y-6">
      <!-- BANNER SUPERIOR COM PERFIL DO USUÁRIO -->
      <div class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div class="flex items-center gap-4">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black uppercase shadow-xs"
              :class="user.role === 'TEACHER' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'"
            >
              {{ user.name ? user.name.charAt(0) : 'U' }}
            </div>

            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {{ user.name }}
                </h1>

                <!-- BADGE DE PAPEL -->
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="user.role === 'TEACHER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'"
                >
                  <span class="material-symbols-rounded text-xs">
                    {{ user.role === 'TEACHER' ? 'cast_for_education' : 'school' }}
                  </span>
                  {{ user.role === 'TEACHER' ? 'Professor' : 'Aluno' }}
                </span>

                <!-- STATUS ATIVO/INATIVO -->
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  :class="user.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="user.active ? 'bg-emerald-500' : 'bg-red-500'" />
                  {{ user.active ? 'Conta Ativa' : 'Inativa' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-rounded text-sm">mail</span>
                  {{ user.email }}
                </span>
                <span class="flex items-center gap-1">
                  <span class="material-symbols-rounded text-sm">calendar_today</span>
                  Cadastrado em {{ formatDate(user.createdAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SE FOR PROFESSOR: EXIBE PAINEL ESPECÍFICO DE PROFESSOR -->
      <div v-if="user.role === 'TEACHER'" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Turmas Criadas</span>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ data.teacherStats?.classroomsCount || 0 }}</div>
          </div>
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total de Alunos nas Turmas</span>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ data.teacherStats?.totalStudentsEnrolled || 0 }}</div>
          </div>
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Redações Corrigidas</span>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ data.teacherStats?.correctionsCount || 0 }}</div>
          </div>
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nota Média Atribuída</span>
            <div class="text-2xl font-black text-indigo-600 dark:text-indigo-400">{{ data.teacherStats?.averageScoreGiven || 0 }} pts</div>
          </div>
        </div>

        <!-- TURMAS DO PROFESSOR -->
        <div class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Turmas sob Liderança</h3>
          <div v-if="data.classroomsLed?.length === 0" class="text-xs text-zinc-400 italic">Nenhuma turma criada.</div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="c in data.classroomsLed" :key="c.id" class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
              <div class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{{ c.name }}</div>
              <div class="text-xs text-zinc-400">Código: <code class="font-mono">{{ c.code }}</code></div>
              <div class="text-xs text-zinc-500 font-semibold">{{ c.membersCount }} alunos • {{ c.essaysCount }} redações</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SE FOR ALUNO: PAINEL COMPLETO DE ATIVIDADES, REDAÇÕES, QUESTÕES E ACERTOS -->
      <div v-else class="space-y-6">
        <!-- CARDS DE MÉTRICAS DO ALUNO (QUESTÕES, ACERTOS, REDAÇÕES, AULAS) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- QUESTÕES & TAXA DE ACERTO -->
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Questões & Acertos</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <span class="material-symbols-rounded text-lg">quiz</span>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {{ stats.questions?.total || 0 }}
              </span>
              <span class="text-xs font-bold text-blue-600 dark:text-blue-400">
                ({{ stats.questions?.accuracyRate || 0 }}% acertos)
              </span>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                class="bg-emerald-500 transition-all duration-500"
                :style="{ width: `${stats.questions?.accuracyRate || 0}%` }"
              />
              <div
                class="bg-red-400 transition-all duration-500"
                :style="{ width: `${100 - (stats.questions?.accuracyRate || 0)}%` }"
              />
            </div>
            <div class="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">✓ {{ stats.questions?.correct || 0 }} acertos</span>
              <span class="text-red-500 dark:text-red-400">✗ {{ stats.questions?.incorrect || 0 }} erros</span>
            </div>
          </div>

          <!-- REDAÇÕES DO ENEM -->
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Redações do ENEM</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">
                <span class="material-symbols-rounded text-lg">edit_note</span>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {{ stats.essays?.total || 0 }}
              </span>
              <span v-if="stats.essays?.averageScore" class="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">
                Média: {{ stats.essays.averageScore }} pts
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span class="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold">
                {{ stats.essays?.aiGraded || 0 }} por IA
              </span>
              <span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold">
                {{ stats.essays?.teacherGraded || 0 }} por Turma
              </span>
            </div>
            <div class="text-[11px] text-zinc-400">
              Melhor nota: <strong class="text-zinc-800 dark:text-zinc-200">{{ stats.essays?.bestScore || 0 }} pts</strong>
            </div>
          </div>

          <!-- AULAS CONCLUÍDAS -->
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aulas no Cronograma</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                <span class="material-symbols-rounded text-lg">play_lesson</span>
              </span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {{ stats.lessons?.completedCount || 0 }}
            </div>
            <p class="text-[11px] text-zinc-400 leading-tight">
              Aulas e videoaulas concluídas pelo estudante nas disciplinas.
            </p>
          </div>

          <!-- TURMAS MATRICULADAS -->
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Turmas</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span class="material-symbols-rounded text-lg">groups</span>
              </span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {{ stats.classroomsCount || 0 }}
            </div>
            <p class="text-[11px] text-zinc-400 leading-tight">
              Turmas escolares e de professores às quais o estudante pertence.
            </p>
          </div>
        </div>

        <!-- ABAS DE NAVEGAÇÃO DETALHADA -->
        <div class="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            @click="activeTab = 'overview'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span class="material-symbols-rounded text-sm">dashboard</span>
            <span>Visão Geral & Desempenho</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'essays'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'essays'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span class="material-symbols-rounded text-sm">edit_note</span>
            <span>Redações ({{ essays.length }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'questions'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'questions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span class="material-symbols-rounded text-sm">quiz</span>
            <span>Questões & Acertos ({{ questionAnswers.length }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'lessons'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'lessons'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span class="material-symbols-rounded text-sm">play_lesson</span>
            <span>Aulas Assistidas ({{ lessonProgress.length }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'classrooms'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            :class="activeTab === 'classrooms'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            <span class="material-symbols-rounded text-sm">groups</span>
            <span>Turmas ({{ classrooms.length }})</span>
          </button>
        </div>

        <!-- ABA 1: VISÃO GERAL & DESEMPENHO -->
        <div v-if="activeTab === 'overview'" class="grid gap-6 lg:grid-cols-2">
          <!-- DESEMPENHO DE ACERTOS POR MATÉRIA -->
          <div class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-2xs">
            <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span class="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl">bar_chart</span>
              <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Taxa de Acertos por Matéria
              </h3>
            </div>

            <div v-if="performanceBySubject.length === 0" class="py-8 text-center text-xs text-zinc-400 italic">
              O aluno ainda não resolveu questões no simulador.
            </div>

            <div v-else class="space-y-4">
              <div v-for="subj in performanceBySubject" :key="subj.name" class="space-y-1.5">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: subj.color }" />
                    {{ subj.name }}
                  </span>
                  <span class="text-zinc-500 dark:text-zinc-400 font-mono">
                    {{ subj.correct }}/{{ subj.total }} (<strong class="text-zinc-900 dark:text-zinc-100">{{ subj.accuracy }}%</strong>)
                  </span>
                </div>
                <div class="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :style="{
                      width: `${subj.accuracy}%`,
                      backgroundColor: subj.color
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- MÉDIAS DAS 5 COMPETÊNCIAS DO ENEM -->
          <div class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-2xs">
            <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span class="material-symbols-rounded text-fuchsia-600 dark:text-fuchsia-400 text-xl">military_tech</span>
              <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Médias nas 5 Competências do ENEM (0 a 200)
              </h3>
            </div>

            <div v-if="stats.essays?.graded === 0" class="py-8 text-center text-xs text-zinc-400 italic">
              Nenhuma redação corrigida ainda para compor as médias de competência.
            </div>

            <div v-else class="space-y-3.5">
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-700 dark:text-zinc-300">C1: Domínio da Norma Culta</span>
                  <span class="font-mono text-purple-600 dark:text-purple-400">{{ stats.essays?.avgCompetencies?.c1 || 0 }} pts</span>
                </div>
                <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-purple-600" :style="{ width: `${((stats.essays?.avgCompetencies?.c1 || 0) / 200) * 100}%` }" />
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-700 dark:text-zinc-300">C2: Compreensão do Tema e Repertório</span>
                  <span class="font-mono text-purple-600 dark:text-purple-400">{{ stats.essays?.avgCompetencies?.c2 || 0 }} pts</span>
                </div>
                <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-purple-600" :style="{ width: `${((stats.essays?.avgCompetencies?.c2 || 0) / 200) * 100}%` }" />
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-700 dark:text-zinc-300">C3: Projeto de Texto e Argumentação</span>
                  <span class="font-mono text-purple-600 dark:text-purple-400">{{ stats.essays?.avgCompetencies?.c3 || 0 }} pts</span>
                </div>
                <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-purple-600" :style="{ width: `${((stats.essays?.avgCompetencies?.c3 || 0) / 200) * 100}%` }" />
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-700 dark:text-zinc-300">C4: Coesão e Mecanismos Linguísticos</span>
                  <span class="font-mono text-purple-600 dark:text-purple-400">{{ stats.essays?.avgCompetencies?.c4 || 0 }} pts</span>
                </div>
                <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-purple-600" :style="{ width: `${((stats.essays?.avgCompetencies?.c4 || 0) / 200) * 100}%` }" />
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-zinc-700 dark:text-zinc-300">C5: Proposta de Intervenção Social</span>
                  <span class="font-mono text-purple-600 dark:text-purple-400">{{ stats.essays?.avgCompetencies?.c5 || 0 }} pts</span>
                </div>
                <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full bg-purple-600" :style="{ width: `${((stats.essays?.avgCompetencies?.c5 || 0) / 200) * 100}%` }" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ABA 2: REDAÇÕES DO ALUNO -->
        <div v-if="activeTab === 'essays'" class="space-y-4">
          <div v-if="essays.length === 0" class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center space-y-2">
            <span class="material-symbols-rounded text-4xl text-zinc-400">edit_off</span>
            <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">Nenhuma redação enviada</h3>
            <p class="text-xs text-zinc-500">Este aluno ainda não submeteu redações para correção.</p>
          </div>

          <div v-else class="grid gap-4">
            <div
              v-for="essay in essays"
              :key="essay.id"
              class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs space-y-3"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      :class="essay.isAiCorrection ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'"
                    >
                      {{ essay.isAiCorrection ? '🤖 Corrigida por IA' : '👨‍🏫 Turma / Professor' }}
                    </span>

                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      :class="essay.status === 'GRADED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'"
                    >
                      {{ essay.status === 'GRADED' ? 'Corrigida' : 'Aguardando Avaliação' }}
                    </span>

                    <span v-if="essay.classroomName" class="text-xs text-zinc-400 font-medium">
                      Turma: <strong class="text-zinc-700 dark:text-zinc-300">{{ essay.classroomName }}</strong>
                    </span>
                  </div>

                  <h4 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {{ essay.theme }}
                  </h4>
                  <p v-if="essay.title" class="text-xs text-zinc-500 italic">"{{ essay.title }}"</p>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div v-if="essay.correction" class="text-right">
                    <div class="text-xl font-black text-purple-600 dark:text-purple-400">
                      {{ essay.correction.totalScore }} <span class="text-xs font-normal text-zinc-400">/ 1000 pts</span>
                    </div>
                    <div class="text-[10px] text-zinc-400">
                      {{ formatDate(essay.correction.createdAt || essay.createdAt, true) }}
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="openEssayModal(essay)"
                    class="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span class="material-symbols-rounded text-sm">visibility</span>
                    <span>Ver Detalhes</span>
                  </button>
                </div>
              </div>

              <!-- NOTAS DETALHADAS C1-C5 -->
              <div v-if="essay.correction" class="grid grid-cols-5 gap-2 text-center text-xs">
                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                  <div class="text-[10px] font-bold text-zinc-400">C1</div>
                  <div class="font-black text-zinc-900 dark:text-zinc-100">{{ essay.correction.c1Score }}</div>
                </div>
                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                  <div class="text-[10px] font-bold text-zinc-400">C2</div>
                  <div class="font-black text-zinc-900 dark:text-zinc-100">{{ essay.correction.c2Score }}</div>
                </div>
                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                  <div class="text-[10px] font-bold text-zinc-400">C3</div>
                  <div class="font-black text-zinc-900 dark:text-zinc-100">{{ essay.correction.c3Score }}</div>
                </div>
                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                  <div class="text-[10px] font-bold text-zinc-400">C4</div>
                  <div class="font-black text-zinc-900 dark:text-zinc-100">{{ essay.correction.c4Score }}</div>
                </div>
                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                  <div class="text-[10px] font-bold text-zinc-400">C5</div>
                  <div class="font-black text-zinc-900 dark:text-zinc-100">{{ essay.correction.c5Score }}</div>
                </div>
              </div>

              <div v-if="essay.correction?.generalFeedback" class="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl line-clamp-2">
                <strong>Parecer:</strong> {{ essay.correction.generalFeedback }}
              </div>
            </div>
          </div>
        </div>

        <!-- ABA 3: QUESTÕES & ACERTOS -->
        <div v-if="activeTab === 'questions'" class="space-y-4">
          <!-- FILTROS DE QUESTÕES -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold">
              <button
                type="button"
                @click="questionFilter = 'ALL'"
                class="px-3 py-1.5 rounded-lg transition cursor-pointer"
                :class="questionFilter === 'ALL' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs' : 'text-zinc-500'"
              >
                Todas ({{ questionAnswers.length }})
              </button>
              <button
                type="button"
                @click="questionFilter = 'CORRECT'"
                class="px-3 py-1.5 rounded-lg transition cursor-pointer text-emerald-600 dark:text-emerald-400"
                :class="questionFilter === 'CORRECT' ? 'bg-white dark:bg-zinc-900 shadow-2xs font-black' : ''"
              >
                Acertos ({{ questionAnswers.filter(q => q.isCorrect).length }})
              </button>
              <button
                type="button"
                @click="questionFilter = 'INCORRECT'"
                class="px-3 py-1.5 rounded-lg transition cursor-pointer text-red-500 dark:text-red-400"
                :class="questionFilter === 'INCORRECT' ? 'bg-white dark:bg-zinc-900 shadow-2xs font-black' : ''"
              >
                Erros ({{ questionAnswers.filter(q => !q.isCorrect).length }})
              </button>
            </div>

            <div class="text-xs text-zinc-400">
              Mostrando <strong>{{ filteredQuestionAnswers.length }}</strong> resolução(ões)
            </div>
          </div>

          <!-- TABELA DE QUESTÕES -->
          <div v-if="filteredQuestionAnswers.length === 0" class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-xs text-zinc-400">
            Nenhuma questão registrada com o filtro selecionado.
          </div>

          <div v-else class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs">
                <thead class="bg-zinc-50 dark:bg-zinc-800/80 font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th class="px-5 py-3.5">Matéria / Disciplina</th>
                    <th class="px-5 py-3.5">Enunciado da Questão</th>
                    <th class="px-5 py-3.5 text-center">Alternativa</th>
                    <th class="px-5 py-3.5 text-center">Resultado</th>
                    <th class="px-5 py-3.5 text-right">Data</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr v-for="ans in filteredQuestionAnswers" :key="ans.id" class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition">
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        :style="{
                          backgroundColor: ans.question?.subjectColor + '15',
                          color: ans.question?.subjectColor || '#8b5cf6'
                        }"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: ans.question?.subjectColor || '#8b5cf6' }" />
                        {{ ans.question?.subjectName }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 max-w-md">
                      <p class="text-zinc-800 dark:text-zinc-200 line-clamp-2 font-medium">
                        {{ ans.question?.statement }}
                      </p>
                      <div class="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                        <span v-if="ans.question?.year">ENEM {{ ans.question.year }}</span>
                        <span v-if="ans.question?.difficulty">• {{ ans.question.difficulty }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                      {{ ans.option }}
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <span
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                        :class="ans.isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'"
                      >
                        <span class="material-symbols-rounded text-xs">{{ ans.isCorrect ? 'check_circle' : 'cancel' }}</span>
                        {{ ans.isCorrect ? 'Acertou' : 'Errou' }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-right text-zinc-400 text-[11px] whitespace-nowrap">
                      {{ formatDate(ans.createdAt, true) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ABA 4: AULAS ASSISTIDAS -->
        <div v-if="activeTab === 'lessons'" class="space-y-4">
          <div v-if="lessonProgress.length === 0" class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center space-y-2">
            <span class="material-symbols-rounded text-4xl text-zinc-400">video_library</span>
            <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">Nenhuma aula assistida</h3>
            <p class="text-xs text-zinc-500">O aluno ainda não marcou aulas como concluídas no cronograma.</p>
          </div>

          <div v-else class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs divide-y divide-zinc-100 dark:divide-zinc-800">
            <div
              v-for="lp in lessonProgress"
              :key="lp.id"
              class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <span class="material-symbols-rounded text-lg">check_circle</span>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {{ lp.lesson?.title }}
                  </h4>
                  <div class="text-[11px] text-zinc-400 flex items-center gap-2">
                    <span>{{ lp.lesson?.moduleTitle }}</span>
                    <span>•</span>
                    <span class="font-semibold" :style="{ color: lp.lesson?.subjectColor }">{{ lp.lesson?.subjectName }}</span>
                  </div>
                </div>
              </div>

              <div class="text-right text-[11px] text-zinc-400 shrink-0">
                Concluída em {{ formatDate(lp.completedAt, true) }}
              </div>
            </div>
          </div>
        </div>

        <!-- ABA 5: TURMAS MATRICULADAS -->
        <div v-if="activeTab === 'classrooms'" class="space-y-4">
          <div v-if="classrooms.length === 0" class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center space-y-2">
            <span class="material-symbols-rounded text-4xl text-zinc-400">meeting_room</span>
            <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sem turmas vinculadas</h3>
            <p class="text-xs text-zinc-500">Este aluno estuda de forma independente e não ingressou em nenhuma turma com código.</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="c in classrooms"
              :key="c.id"
              class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs space-y-3"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <span class="material-symbols-rounded text-xl">school</span>
                </div>
                <div>
                  <h4 class="text-sm font-black text-zinc-900 dark:text-zinc-100">{{ c.name }}</h4>
                  <p class="text-[11px] text-zinc-400 font-mono">Código: {{ c.code }}</p>
                </div>
              </div>

              <div class="text-xs text-zinc-500 space-y-1 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div>Professor: <strong class="text-zinc-800 dark:text-zinc-200">{{ c.teacherName }}</strong></div>
                <div v-if="c.teacherEmail" class="text-[11px] text-zinc-400">{{ c.teacherEmail }}</div>
                <div class="text-[11px] text-zinc-400">{{ c.membersCount }} alunos nesta turma</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE VISUALIZAÇÃO COMPLETA DA REDAÇÃO -->
    <Teleport to="body">
      <div
        v-if="showEssayModal && selectedEssay"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        @click.self="showEssayModal = false"
      >
        <div class="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 my-8">
          <!-- CABEÇALHO DO MODAL -->
          <div class="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-4">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                  :class="selectedEssay.isAiCorrection ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border border-fuchsia-200' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200'"
                >
                  {{ selectedEssay.isAiCorrection ? 'Correção por Inteligência Artificial' : 'Correção por Professor' }}
                </span>
                <span class="text-xs text-zinc-400">{{ formatDate(selectedEssay.createdAt, true) }}</span>
              </div>
              <h3 class="text-base font-black text-zinc-900 dark:text-zinc-100">
                {{ selectedEssay.theme }}
              </h3>
              <p v-if="selectedEssay.title" class="text-xs text-purple-600 dark:text-purple-400 font-bold">
                Título: "{{ selectedEssay.title }}"
              </p>
            </div>

            <button
              type="button"
              @click="showEssayModal = false"
              class="h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          <!-- NOTA E FEEDBACK GERAL -->
          <div v-if="selectedEssay.correction" class="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">Nota Oficial do ENEM</span>
                <span class="text-3xl font-black text-purple-900 dark:text-purple-100">{{ selectedEssay.correction.totalScore }}</span>
                <span class="text-xs text-purple-700/80 dark:text-purple-300/80"> / 1000 pontos</span>
              </div>
              <span class="text-xs font-bold text-purple-800 dark:text-purple-200 bg-white/80 dark:bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                Avaliador: {{ selectedEssay.correction.evaluatorName }}
              </span>
            </div>

            <!-- TABELA DAS 5 COMPETÊNCIAS -->
            <div class="grid grid-cols-5 gap-2 text-center text-xs pt-1">
              <div class="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                <div class="text-[10px] font-bold text-zinc-400">C1</div>
                <div class="font-black text-purple-700 dark:text-purple-300">{{ selectedEssay.correction.c1Score }}</div>
              </div>
              <div class="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                <div class="text-[10px] font-bold text-zinc-400">C2</div>
                <div class="font-black text-purple-700 dark:text-purple-300">{{ selectedEssay.correction.c2Score }}</div>
              </div>
              <div class="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                <div class="text-[10px] font-bold text-zinc-400">C3</div>
                <div class="font-black text-purple-700 dark:text-purple-300">{{ selectedEssay.correction.c3Score }}</div>
              </div>
              <div class="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                <div class="text-[10px] font-bold text-zinc-400">C4</div>
                <div class="font-black text-purple-700 dark:text-purple-300">{{ selectedEssay.correction.c4Score }}</div>
              </div>
              <div class="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800">
                <div class="text-[10px] font-bold text-zinc-400">C5</div>
                <div class="font-black text-purple-700 dark:text-purple-300">{{ selectedEssay.correction.c5Score }}</div>
              </div>
            </div>

            <div v-if="selectedEssay.correction.generalFeedback" class="text-xs text-purple-950 dark:text-purple-200 leading-relaxed pt-1">
              <strong>Diagnóstico Geral da Banca:</strong> {{ selectedEssay.correction.generalFeedback }}
            </div>
          </div>

          <!-- TEXTO ESCRITO DO ALUNO -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Texto Redigido pelo Aluno</h4>
            <div class="p-4.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-serif max-h-[300px] overflow-y-auto">
              {{ selectedEssay.content || 'Redação enviada por foto ou manuscrito.' }}
            </div>
          </div>

          <!-- BOTÃO FECHAR -->
          <div class="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              @click="showEssayModal = false"
              class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
