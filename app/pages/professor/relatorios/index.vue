<script setup>
definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

useSeoMeta({
  title: 'Relatórios & Desempenho — Painel do Professor | Conecta Enem'
})

const loading = ref(true)
const dashboardData = ref(null)
const essays = ref([])
const classrooms = ref([])

async function loadAnalytics() {
  loading.value = true
  try {
    const [dashRes, essaysRes] = await Promise.allSettled([
      $fetch('/api/teacher/dashboard', { credentials: 'include' }),
      $fetch('/api/teacher/essays?limit=200', { credentials: 'include' })
    ])

    if (dashRes.status === 'fulfilled') {
      dashboardData.value = dashRes.value
    }

    if (essaysRes.status === 'fulfilled' && essaysRes.value?.essays) {
      essays.value = essaysRes.value.essays
      classrooms.value = essaysRes.value.classrooms || []
    }
  } catch (err) {
    console.error('Erro ao carregar relatórios:', err)
  } finally {
    loading.value = false
  }
}

// Redações corrigidas com nota
const gradedEssays = computed(() => {
  return essays.value.filter(e => e.status === 'GRADED' && e.correction)
})

// Média Geral
const averageScore = computed(() => {
  if (gradedEssays.value.length === 0) return 0
  const sum = gradedEssays.value.reduce((acc, e) => acc + (e.correction?.totalScore || 0), 0)
  return Math.round(sum / gradedEssays.value.length)
})

// Médias por Competência (C1 a C5)
const competencyAverages = computed(() => {
  if (gradedEssays.value.length === 0) {
    return { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 }
  }
  const count = gradedEssays.value.length
  return {
    c1: Math.round(gradedEssays.value.reduce((acc, e) => acc + (e.correction?.c1Score || 0), 0) / count),
    c2: Math.round(gradedEssays.value.reduce((acc, e) => acc + (e.correction?.c2Score || 0), 0) / count),
    c3: Math.round(gradedEssays.value.reduce((acc, e) => acc + (e.correction?.c3Score || 0), 0) / count),
    c4: Math.round(gradedEssays.value.reduce((acc, e) => acc + (e.correction?.c4Score || 0), 0) / count),
    c5: Math.round(gradedEssays.value.reduce((acc, e) => acc + (e.correction?.c5Score || 0), 0) / count)
  }
})

// Distribuição de Faixas de Nota
const scoreDistribution = computed(() => {
  const dist = { excellent: 0, veryGood: 0, regular: 0, attention: 0 }
  gradedEssays.value.forEach(e => {
    const s = e.correction?.totalScore || 0
    if (s >= 900) dist.excellent++
    else if (s >= 800) dist.veryGood++
    else if (s >= 600) dist.regular++
    else dist.attention++
  })
  return dist
})

// Taxa de Correção
const correctionRate = computed(() => {
  if (essays.value.length === 0) return 0
  return Math.round((gradedEssays.value.length / essays.value.length) * 100)
})

onMounted(() => {
  loadAnalytics()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Cabeçalho -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight dark:text-zinc-100">
          Relatórios & Desempenho
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          Acompanhe o rendimento geral das suas turmas e a evolução nas 5 competências do ENEM.
        </p>
      </div>

      <button
        type="button"
        @click="loadAnalytics"
        class="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer self-start sm:self-auto"
      >
        <span class="material-symbols-rounded text-base">refresh</span>
        <span>Atualizar Dados</span>
      </button>
    </div>

    <!-- CARDS DE MÉTRICAS GERAIS -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Média Geral</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <span class="material-symbols-rounded text-lg">military_tech</span>
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400">
          {{ loading ? '...' : (gradedEssays.length > 0 ? averageScore : '—') }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
          Baseado em {{ gradedEssays.length }} redação(ões)
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Taxa de Correção</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <span class="material-symbols-rounded text-lg">task_alt</span>
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100">
          {{ loading ? '...' : `${correctionRate}%` }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          {{ gradedEssays.length }} de {{ essays.length }} avaliadas
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total de Redações</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <span class="material-symbols-rounded text-lg">description</span>
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100">
          {{ loading ? '...' : essays.length }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
          Enviadas pelos alunos
        </span>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Pendentes</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <span class="material-symbols-rounded text-lg">hourglass_top</span>
          </div>
        </div>
        <p class="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
          {{ loading ? '...' : (essays.length - gradedEssays.length) }}
        </p>
        <span class="mt-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
          Aguardando avaliação
        </span>
      </div>
    </div>

    <!-- SEÇÃO DUPLA: MÉDIAS POR COMPETÊNCIA + FAIXAS DE NOTA -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 1. MÉDIA POR COMPETÊNCIA ENEM -->
      <div class="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-5 shadow-xs">
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <span class="material-symbols-rounded text-purple-600">bar_chart</span>
            Média por Competência (0 a 200)
          </h3>
          <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Desempenho consolidado dos alunos em cada critério oficial do INEP.
          </p>
        </div>

        <div class="space-y-4">
          <div v-for="(val, key) in competencyAverages" :key="key" class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-700 dark:text-zinc-300">
                {{ key === 'c1' ? 'C1: Norma Culta' : key === 'c2' ? 'C2: Tema & Repertório' : key === 'c3' ? 'C3: Projeto de Texto' : key === 'c4' ? 'C4: Coesão' : 'C5: Proposta de Intervenção' }}
              </span>
              <span class="font-black text-purple-700 dark:text-purple-400">{{ val }} / 200</span>
            </div>
            <!-- Barra de Progresso -->
            <div class="h-2.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-linear-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                :style="{ width: \`\${Math.min(100, Math.round((val / 200) * 100))}%\` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. DISTRIBUIÇÃO DAS NOTAS -->
      <div class="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-5 shadow-xs">
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <span class="material-symbols-rounded text-indigo-600">pie_chart</span>
            Distribuição de Faixas de Nota
          </h3>
          <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Quantidade de redações em cada faixa de pontuação.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800/50 space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">900+ Pontos</span>
            <p class="text-2xl font-black text-emerald-700 dark:text-emerald-400">{{ scoreDistribution.excellent }}</p>
            <span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Excelente</span>
          </div>

          <div class="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-800/50 space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">800 - 899 Pontos</span>
            <p class="text-2xl font-black text-blue-700 dark:text-blue-400">{{ scoreDistribution.veryGood }}</p>
            <span class="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Muito Bom</span>
          </div>

          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-800/50 space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">600 - 799 Pontos</span>
            <p class="text-2xl font-black text-amber-700 dark:text-amber-400">{{ scoreDistribution.regular }}</p>
            <span class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Regular / Na Média</span>
          </div>

          <div class="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-800/50 space-y-1">
            <span class="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">Abaixo de 600</span>
            <p class="text-2xl font-black text-rose-700 dark:text-rose-400">{{ scoreDistribution.attention }}</p>
            <span class="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Precisa de Atenção</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
