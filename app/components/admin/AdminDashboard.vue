<script setup>
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

const userStats = ref({
  students: 0,
  teachers: 0,
  admins: 0,
  total: 0,
  classrooms: 0,
  classroomMembers: 0
})

const questionStats = ref({
  total: 0,
  easy: 0,
  medium: 0,
  hard: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  accuracyRate: 0,
  bySubject: []
})

const essayStats = ref({
  total: 0,
  graded: 0,
  pending: 0,
  correcting: 0,
  averageScore: 0,
  bands: {
    band0_400: 0,
    band400_600: 0,
    band600_800: 0,
    band800_1000: 0
  }
})

const platformUsage = ref({
  completedLessons: 0,
  totalQuestionsAnswered: 0,
  totalEssaysSubmitted: 0,
  totalSubjects: 0,
  totalModules: 0,
  totalLessons: 0
})

const activityTimeline = ref([])
const activeTimelineMetric = ref('total') // 'total', 'questions', 'aiEssays', 'essays', 'users'

// Filtro de período dinâmico do gráfico
const selectedPeriod = ref(7)
const periodOptions = [
  { label: '2 Dias', value: 2 },
  { label: '7 Dias', value: 7 },
  { label: '15 Dias', value: 15 },
  { label: '1 Mês', value: 30 }
]

const periodLabel = computed(() => {
  if (selectedPeriod.value === 2) return 'Últimas 48 horas'
  if (selectedPeriod.value === 7) return 'Últimos 7 dias'
  if (selectedPeriod.value === 15) return 'Últimos 15 dias'
  if (selectedPeriod.value === 30) return 'Último mês'
  return `Últimos ${selectedPeriod.value} dias`
})

async function changePeriod(days) {
  if (selectedPeriod.value === days) return
  selectedPeriod.value = days
  hoveredPoint.value = null
  await fetchDashboardStats()
}

// Tooltip e controle estável de hover no gráfico (sem jitter / tremedeira)
const hoveredPoint = ref(null)

const metricConfig = computed(() => {
  switch (activeTimelineMetric.value) {
    case 'questions':
      return {
        unit: 'questões resolvidas',
        color: '#3b82f6',
        badge: 'Questões'
      }
    case 'aiEssays':
      return {
        unit: 'redações corrigidas por IA',
        color: '#d946ef',
        badge: 'Redações IA'
      }
    case 'essays':
      return {
        unit: 'redações no total',
        color: '#a855f7',
        badge: 'Todas Redações'
      }
    case 'users':
      return {
        unit: 'novos alunos cadastrados',
        color: '#10b981',
        badge: 'Novos Alunos'
      }
    default:
      return {
        unit: 'interações gerais',
        color: '#8b5cf6',
        badge: 'Geral'
      }
  }
})

function shouldShowLabel(idx, totalCount) {
  if (totalCount <= 8) return true
  if (totalCount <= 16) return idx % 2 === 0 || idx === totalCount - 1
  return idx % 4 === 0 || idx === totalCount - 1
}

async function fetchDashboardStats() {
  loading.value = true
  try {
    const res = await $fetch(`/api/admin/dashboard?days=${selectedPeriod.value}`, { credentials: 'include' })
    if (res) {
      if (res.stats) stats.value = res.stats
      if (res.userStats) userStats.value = res.userStats
      if (res.questionStats) questionStats.value = res.questionStats
      if (res.essayStats) essayStats.value = res.essayStats
      if (res.platformUsage) platformUsage.value = res.platformUsage
      if (res.activityTimeline) activityTimeline.value = res.activityTimeline
    }
  } catch (err) {
    console.error('Erro ao carregar estatísticas do admin:', err)
  } finally {
    loading.value = false
  }
}

// ==========================================
// CÁLCULOS E AUXILIARES DOS GRÁFICOS
// ==========================================

// 1. Usuários: Proporções
const studentPercent = computed(() => {
  const total = userStats.value.total || 1
  return Math.round((userStats.value.students / total) * 100)
})

const teacherPercent = computed(() => {
  const total = userStats.value.total || 1
  return Math.round((userStats.value.teachers / total) * 100)
})

// 2. Questões: Dificuldade
const easyPercent = computed(() => {
  const total = questionStats.value.total || 1
  return Math.round((questionStats.value.easy / total) * 100)
})

const mediumPercent = computed(() => {
  const total = questionStats.value.total || 1
  return Math.round((questionStats.value.medium / total) * 100)
})

const hardPercent = computed(() => {
  const total = questionStats.value.total || 1
  return Math.round((questionStats.value.hard / total) * 100)
})

// 3. Redações: Faixas de nota proporcionais para o gráfico de barras verticais
const totalGradedEssays = computed(() => {
  const b = essayStats.value.bands || {}
  const sum = (b.band0_400 || 0) + (b.band400_600 || 0) + (b.band600_800 || 0) + (b.band800_1000 || 0)
  return sum > 0 ? sum : 1
})

const essayBandBars = computed(() => {
  const b = essayStats.value.bands || {}
  const total = totalGradedEssays.value
  return [
    {
      label: '0 a 400',
      subtitle: 'Iniciante',
      count: b.band0_400 || 0,
      percent: Math.round(((b.band0_400 || 0) / total) * 100),
      color: 'from-rose-500 to-red-600',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/40'
    },
    {
      label: '420 a 600',
      subtitle: 'Em evolução',
      count: b.band400_600 || 0,
      percent: Math.round(((b.band400_600 || 0) / total) * 100),
      color: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      label: '620 a 800',
      subtitle: 'Competitivo',
      count: b.band600_800 || 0,
      percent: Math.round(((b.band600_800 || 0) / total) * 100),
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40'
    },
    {
      label: '820 a 1000',
      subtitle: 'Nota 1000',
      count: b.band800_1000 || 0,
      percent: Math.round(((b.band800_1000 || 0) / total) * 100),
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/40'
    }
  ]
})

// 4. Gráfico SVG de Linha/Área de Atividade Recente (7 dias)
const svgWidth = 600
const svgHeight = 220
const padding = { top: 20, right: 20, bottom: 35, left: 35 }

const timelinePoints = computed(() => {
  const list = activityTimeline.value || []
  if (list.length === 0) return []

  const metric = activeTimelineMetric.value
  const values = list.map(item => Number(item[metric]) || 0)
  const maxVal = Math.max(...values, 4)

  const chartW = svgWidth - padding.left - padding.right
  const chartH = svgHeight - padding.top - padding.bottom
  const count = list.length
  const stepX = count > 1 ? chartW / (count - 1) : 0

  return list.map((item, idx) => {
    const val = Number(item[metric]) || 0
    const x = count === 1 ? padding.left + chartW / 2 : padding.left + idx * stepX
    const y = padding.top + chartH - (val / maxVal) * chartH
    const hitW = count === 1 ? chartW : stepX
    const hitX = count === 1 ? padding.left : x - hitW / 2

    return {
      x,
      y,
      val,
      label: item.label,
      date: item.date,
      hitX,
      hitWidth: hitW,
      item
    }
  })
})

const svgPath = computed(() => {
  const pts = timelinePoints.value
  if (pts.length === 0) return ''
  return pts.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')
})

const svgAreaPath = computed(() => {
  const pts = timelinePoints.value
  if (pts.length === 0) return ''
  const bottomY = svgHeight - padding.bottom
  const line = svgPath.value
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `${line} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`
})

onMounted(() => {
  fetchDashboardStats()
})
</script>

<template>
  <div class="space-y-7">
    <!-- CABEÇALHO DO DASHBOARD -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-2xl text-purple-600 dark:text-purple-400">monitoring</span>
          <h1 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Painel de Métricas & Desempenho
          </h1>
        </div>
        <p class="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Acompanhe gráficos analíticos de alunos, professores, banco de questões, redações e uso global da plataforma.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="fetchDashboardStats"
          :disabled="loading"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
          title="Recarregar estatísticas"
        >
          <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': loading }">sync</span>
          <span>Atualizar Dados</span>
        </button>
      </div>
    </div>

    <!-- CARDS SUPERIORES DE DESTAQUE COM CORES E ÍCONES REAIS -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- ESTUDANTES -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/usuarios')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 dark:text-zinc-400 block uppercase tracking-wider">Estudantes</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
            {{ userStats.students }}
          </span>
          <span class="text-[11px] text-zinc-400 block font-medium">
            {{ userStats.classroomMembers }} matriculados em turmas
          </span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 group-hover:scale-110 transition-transform">
          <span class="material-symbols-rounded text-2xl">school</span>
        </div>
      </div>

      <!-- PROFESSORES & TURMAS -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/usuarios')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 dark:text-zinc-400 block uppercase tracking-wider">Professores</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {{ userStats.teachers }}
          </span>
          <span class="text-[11px] text-zinc-400 block font-medium">
            {{ userStats.classrooms }} salas de aula ativas
          </span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 group-hover:scale-110 transition-transform">
          <span class="material-symbols-rounded text-2xl">cast_for_education</span>
        </div>
      </div>

      <!-- BANCO DE QUESTÕES -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/questoes')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 dark:text-zinc-400 block uppercase tracking-wider">Questões ENEM</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
            {{ questionStats.total }}
          </span>
          <span class="text-[11px] text-zinc-400 block font-medium">
            {{ questionStats.totalAnswers }} resoluções de alunos
          </span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 group-hover:scale-110 transition-transform">
          <span class="material-symbols-rounded text-2xl">quiz</span>
        </div>
      </div>

      <!-- REDAÇÕES DO ENEM -->
      <div
        class="group relative overflow-hidden flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-300 dark:hover:border-fuchsia-800 hover:shadow-md cursor-pointer"
        @click="navigateTo('/admin/redacao')"
      >
        <div class="space-y-1">
          <span class="text-xs font-bold text-zinc-400 dark:text-zinc-400 block uppercase tracking-wider">Redações</span>
          <span class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition">
            {{ essayStats.total }}
          </span>
          <span class="text-[11px] text-zinc-400 block font-medium">
            Nota média: <strong class="text-fuchsia-600 dark:text-fuchsia-400">{{ essayStats.averageScore }} pts</strong>
            <span v-if="essayStats.aiGraded" class="text-fuchsia-600 dark:text-fuchsia-400 font-bold ml-1.5">• {{ essayStats.aiGraded }} por IA</span>
          </span>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 group-hover:scale-110 transition-transform">
          <span class="material-symbols-rounded text-2xl">edit_note</span>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 1: GRÁFICOS DE ATIVIDADE & COMUNIDADE (PROFESSORES & ALUNOS) -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- GRÁFICO 1: TENDÊNCIA DE ATIVIDADE DIÁRIA (ÁREA/LINHA SVG ESTÁVEL) -->
      <div class="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="material-symbols-rounded text-purple-600 dark:text-purple-400 text-xl">trending_up</span>
              <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Atividade & Uso Recente ({{ periodLabel }})
              </h2>
            </div>
            <p class="text-[11px] text-zinc-400">
              Evolução diária de alunos, professores, questões e correções de IA
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- FILTRO DE PERÍODO (2 DIAS, 7 DIAS, 15 DIAS, 1 MÊS) -->
            <div class="flex items-center gap-0.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-bold">
              <button
                v-for="p in periodOptions"
                :key="p.value"
                type="button"
                @click="changePeriod(p.value)"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer"
                :class="selectedPeriod === p.value ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
                :title="`Filtrar pelos últimos ${p.value} dias`"
              >
                {{ p.label }}
              </button>
            </div>

            <!-- SELETOR DE MÉTRICA DO GRÁFICO -->
            <div class="flex items-center gap-0.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-bold overflow-x-auto scrollbar-none">
              <button
                type="button"
                @click="activeTimelineMetric = 'total'"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                :class="activeTimelineMetric === 'total' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
              >
                Geral
              </button>
              <button
                type="button"
                @click="activeTimelineMetric = 'questions'"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                :class="activeTimelineMetric === 'questions' ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
              >
                Questões
              </button>
              <button
                type="button"
                @click="activeTimelineMetric = 'aiEssays'"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                :class="activeTimelineMetric === 'aiEssays' ? 'bg-white dark:bg-zinc-900 text-fuchsia-600 dark:text-fuchsia-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
              >
                <span class="material-symbols-rounded text-xs">neurology</span>
                <span>Redações IA</span>
              </button>
              <button
                type="button"
                @click="activeTimelineMetric = 'essays'"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                :class="activeTimelineMetric === 'essays' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
              >
                Todas Redações
              </button>
              <button
                type="button"
                @click="activeTimelineMetric = 'users'"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                :class="activeTimelineMetric === 'users' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'"
              >
                Novos Alunos
              </button>
            </div>
          </div>
        </div>

        <!-- VISUALIZADOR SVG DO GRÁFICO (FLUIDO, SEM JITTER / TREMEDEIRA) -->
        <div class="relative w-full h-[220px]">
          <svg
            :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
            class="w-full h-full overflow-visible"
            preserveAspectRatio="none"
            @mouseleave="hoveredPoint = null"
          >
            <defs>
              <linearGradient id="activeAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" :stop-color="metricConfig.color" stop-opacity="0.32" />
                <stop offset="100%" :stop-color="metricConfig.color" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- Linhas de grade horizontais -->
            <line :x1="padding.left" :y1="padding.top" :x2="svgWidth - padding.right" :y2="padding.top" stroke="#71717a" stroke-opacity="0.12" stroke-dasharray="3 3" />
            <line :x1="padding.left" :y1="(svgHeight - padding.bottom + padding.top) / 2" :x2="svgWidth - padding.right" :y2="(svgHeight - padding.bottom + padding.top) / 2" stroke="#71717a" stroke-opacity="0.12" stroke-dasharray="3 3" />
            <line :x1="padding.left" :y1="svgHeight - padding.bottom" :x2="svgWidth - padding.right" :y2="svgHeight - padding.bottom" stroke="#71717a" stroke-opacity="0.25" />

            <!-- Área sombreada suave -->
            <path
              v-if="svgAreaPath"
              :d="svgAreaPath"
              fill="url(#activeAreaGradient)"
              pointer-events="none"
            />

            <!-- Linha da curva -->
            <path
              v-if="svgPath"
              :d="svgPath"
              fill="none"
              :stroke="metricConfig.color"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              pointer-events="none"
            />

            <!-- Guia vertical no ponto com hover (estável) -->
            <line
              v-if="hoveredPoint !== null && timelinePoints[hoveredPoint]"
              :x1="timelinePoints[hoveredPoint].x"
              :y1="padding.top"
              :x2="timelinePoints[hoveredPoint].x"
              :y2="svgHeight - padding.bottom"
              :stroke="metricConfig.color"
              stroke-width="1.5"
              stroke-dasharray="3 3"
              stroke-opacity="0.5"
              pointer-events="none"
            />

            <!-- Pontos e Labels dos dias (com pointer-events none para evitar jitter) -->
            <g v-for="(p, i) in timelinePoints" :key="'point-' + i" pointer-events="none">
              <!-- Halo suave em hover -->
              <circle
                v-if="hoveredPoint === i"
                :cx="p.x"
                :cy="p.y"
                :r="selectedPeriod > 15 ? 10 : 13"
                :fill="metricConfig.color"
                fill-opacity="0.22"
              />

              <!-- Ponto central da curva -->
              <circle
                :cx="p.x"
                :cy="p.y"
                :r="hoveredPoint === i ? 6.5 : (selectedPeriod > 15 ? 3 : 4.5)"
                :fill="hoveredPoint === i ? metricConfig.color : '#ffffff'"
                :stroke="metricConfig.color"
                :stroke-width="hoveredPoint === i ? 3 : 2"
              />

              <!-- Label do eixo X -->
              <text
                v-if="shouldShowLabel(i, timelinePoints.length)"
                :x="p.x"
                :y="svgHeight - 10"
                text-anchor="middle"
                class="text-[10px] fill-zinc-400 font-medium select-none"
              >
                {{ p.label }}
              </text>
            </g>

            <!-- FAIXAS VERTICAIS INVISÍVEIS PARA CAPTURAR HOVER DE FORMA TOTALMENTE ESTÁVEL E FLUIDA -->
            <rect
              v-for="(p, i) in timelinePoints"
              :key="'hit-' + i"
              :x="Math.max(0, p.hitX)"
              y="0"
              :width="Math.max(12, p.hitWidth)"
              :height="svgHeight"
              fill="transparent"
              class="cursor-pointer"
              @mouseenter="hoveredPoint = i"
            />
          </svg>

          <!-- TOOLTIP FLUTUANTE EM HOVER (POSICIONAMENTO SEGURO CONTRA BORDAS) -->
          <div
            v-if="hoveredPoint !== null && timelinePoints[hoveredPoint]"
            class="absolute pointer-events-none -top-2 rounded-xl bg-zinc-900 text-white px-3.5 py-2 text-xs font-bold shadow-xl border border-zinc-700 z-20 -translate-x-1/2 -translate-y-full"
            :style="{ left: `${Math.max(12, Math.min(88, (timelinePoints[hoveredPoint].x / svgWidth) * 100))}%` }"
          >
            <div class="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <span>{{ timelinePoints[hoveredPoint].label }}</span>
              <span>•</span>
              <span>{{ timelinePoints[hoveredPoint].date }}</span>
            </div>
            <div class="text-sm font-black mt-0.5" :style="{ color: metricConfig.color }">
              {{ timelinePoints[hoveredPoint].val }}
              <span class="text-[10px] font-normal text-zinc-300">
                {{ metricConfig.unit }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- GRÁFICO 2: PROPORÇÃO DA COMUNIDADE (DONUT & BARRAS) -->
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span class="material-symbols-rounded text-indigo-600 dark:text-indigo-400 text-xl">group</span>
            <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
              Alunos & Professores
            </h2>
          </div>

          <!-- PROPORÇÃO VISUAL (BARRA BIPARTIDA) -->
          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-purple-600" />
                Alunos ({{ studentPercent }}%)
              </span>
              <span class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-indigo-600" />
                Professores ({{ teacherPercent }}%)
              </span>
            </div>

            <div class="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                class="h-full bg-gradient-to-r from-purple-600 to-violet-500 transition-all duration-700"
                :style="{ width: `${studentPercent}%` }"
              />
              <div
                class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700"
                :style="{ width: `${teacherPercent}%` }"
              />
            </div>
          </div>

          <!-- LISTA DE DETALHAMENTO -->
          <div class="mt-5 space-y-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div class="flex items-center justify-between text-xs pt-2">
              <span class="text-zinc-500 dark:text-zinc-400">Total de Alunos:</span>
              <strong class="text-zinc-900 dark:text-zinc-100 font-black text-sm">{{ userStats.students }}</strong>
            </div>

            <div class="flex items-center justify-between text-xs pt-2">
              <span class="text-zinc-500 dark:text-zinc-400">Total de Professores:</span>
              <strong class="text-zinc-900 dark:text-zinc-100 font-black text-sm">{{ userStats.teachers }}</strong>
            </div>

            <div class="flex items-center justify-between text-xs pt-2">
              <span class="text-zinc-500 dark:text-zinc-400">Turmas Criadas:</span>
              <strong class="text-indigo-600 dark:text-indigo-400 font-black text-sm">{{ userStats.classrooms }}</strong>
            </div>

            <div class="flex items-center justify-between text-xs pt-2">
              <span class="text-zinc-500 dark:text-zinc-400">Alunos em Turmas:</span>
              <strong class="text-emerald-600 dark:text-emerald-400 font-black text-sm">{{ userStats.classroomMembers }}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="navigateTo('/admin/usuarios')"
          class="w-full mt-2 py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition text-center cursor-pointer"
        >
          Gerenciar Usuários & Turmas →
        </button>
      </div>
    </div>

    <!-- SEÇÃO 2: GRÁFICOS DO BANCO DE QUESTÕES (RESOLUÇÕES & DIFICULDADE) -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- TAXA DE ACERTO GLOBAL (QUESTÕES) -->
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
        <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span class="material-symbols-rounded text-emerald-600 dark:text-emerald-400 text-xl">pie_chart</span>
          <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
            Performance em Questões
          </h2>
        </div>

        <div class="text-center py-2 space-y-1">
          <div class="inline-flex items-baseline gap-1">
            <span class="text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {{ questionStats.accuracyRate }}%
            </span>
            <span class="text-xs font-bold text-zinc-400">acertos</span>
          </div>
          <p class="text-[11px] text-zinc-400">
            Calculado com base em {{ questionStats.totalAnswers }} respostas oficiais de alunos
          </p>
        </div>

        <!-- PROGRESS BAR DUPLA -->
        <div class="space-y-1.5">
          <div class="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div
              class="h-full bg-emerald-500 transition-all duration-700"
              :style="{ width: `${questionStats.accuracyRate}%` }"
            />
            <div
              class="h-full bg-rose-500 transition-all duration-700"
              :style="{ width: `${100 - questionStats.accuracyRate}%` }"
            />
          </div>

          <div class="flex items-center justify-between text-[11px] font-bold">
            <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-emerald-500" />
              {{ questionStats.correctAnswers }} corretas
            </span>
            <span class="text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-rose-500" />
              {{ questionStats.incorrectAnswers }} incorretas
            </span>
          </div>
        </div>
      </div>

      <!-- DISTRIBUIÇÃO POR NÍVEL DE DIFICULDADE -->
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
        <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span class="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl">bar_chart</span>
          <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
            Dificuldade do Banco
          </h2>
        </div>

        <div class="space-y-3 pt-1">
          <!-- FÁCIL -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span class="material-symbols-rounded text-sm">sentiment_satisfied</span>
                Fácil
              </span>
              <span class="text-zinc-600 dark:text-zinc-300">{{ questionStats.easy }} ({{ easyPercent }}%)</span>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" :style="{ width: `${easyPercent}%` }" />
            </div>
          </div>

          <!-- MÉDIO -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span class="material-symbols-rounded text-sm">sentiment_neutral</span>
                Médio
              </span>
              <span class="text-zinc-600 dark:text-zinc-300">{{ questionStats.medium }} ({{ mediumPercent }}%)</span>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div class="h-full bg-amber-500 rounded-full transition-all duration-700" :style="{ width: `${mediumPercent}%` }" />
            </div>
          </div>

          <!-- DIFÍCIL -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span class="material-symbols-rounded text-sm">sentiment_very_dissatisfied</span>
                Difícil
              </span>
              <span class="text-zinc-600 dark:text-zinc-300">{{ questionStats.hard }} ({{ hardPercent }}%)</span>
            </div>
            <div class="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div class="h-full bg-rose-500 rounded-full transition-all duration-700" :style="{ width: `${hardPercent}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- TOP MATÉRIAS COM MAIS QUESTÕES -->
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
        <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <span class="material-symbols-rounded text-purple-600 dark:text-purple-400 text-xl">auto_stories</span>
          <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
            Disciplinas com mais Questões
          </h2>
        </div>

        <div v-if="questionStats.bySubject.length === 0" class="py-6 text-center text-xs text-zinc-400">
          Nenhuma questão cadastrada por disciplina.
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="sub in questionStats.bySubject"
            :key="sub.name"
            class="flex items-center justify-between text-xs"
          >
            <div class="flex items-center gap-2 min-w-0 pr-2">
              <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: sub.color || '#8b5cf6' }" />
              <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate">{{ sub.name }}</span>
            </div>
            <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
              {{ sub.count }} questões
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 3: GRÁFICOS DO LABORATÓRIO DE REDAÇÃO (FAIXAS DE NOTAS DO ENEM) -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- HISTOGRAMA DE NOTAS DO ENEM (BARRAS VERTICAIS) -->
      <div class="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
        <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="material-symbols-rounded text-fuchsia-600 dark:text-fuchsia-400 text-xl">analytics</span>
              <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Distribuição de Desempenho nas Redações (Critérios ENEM)
              </h2>
            </div>
            <p class="text-[11px] text-zinc-400">
              Volume de textos corrigidos por faixas de pontuação oficial de 0 a 1000
            </p>
          </div>

          <div class="text-right">
            <div class="text-[10px] font-bold text-zinc-400 uppercase">Média Geral</div>
            <div class="text-lg font-black text-fuchsia-600 dark:text-fuchsia-400">
              {{ essayStats.averageScore }} pts
            </div>
          </div>
        </div>

        <!-- BARRAS VERTICAIS DE HISTOGRAMA -->
        <div class="grid grid-cols-4 gap-3 sm:gap-4 pt-4 items-end h-[170px]">
          <div
            v-for="band in essayBandBars"
            :key="band.label"
            class="flex flex-col items-center h-full justify-end group cursor-pointer"
          >
            <!-- CONTADOR ACIMA DA BARRA -->
            <span class="text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 transition-transform group-hover:scale-110">
              {{ band.count }}
            </span>

            <!-- COLUNA COM ALTURA PROPORCIONAL -->
            <div class="w-full max-w-[56px] bg-zinc-100 dark:bg-zinc-800/80 rounded-xl overflow-hidden flex flex-col justify-end p-1 h-[110px]">
              <div
                class="w-full rounded-lg bg-gradient-to-t transition-all duration-700 shadow-xs"
                :class="band.color"
                :style="{ height: `${Math.max(12, band.percent)}%` }"
              />
            </div>

            <!-- LABELS INFERIORES -->
            <div class="text-center mt-2 space-y-0.5">
              <div class="text-xs font-black text-zinc-900 dark:text-zinc-100">{{ band.label }}</div>
              <div class="text-[10px] font-bold" :class="band.textColor">{{ band.subtitle }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATUS DAS REDAÇÕES (CORRIGIDAS VS PENDENTES) -->
      <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span class="material-symbols-rounded text-purple-600 dark:text-purple-400 text-xl">fact_check</span>
            <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
              Status das Redações
            </h2>
          </div>

          <div class="mt-4 space-y-3.5">
            <!-- CORRIGIDAS -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-rounded text-emerald-600 dark:text-emerald-400">check_circle</span>
                <div>
                  <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100">Corrigidas & Avaliadas</div>
                  <div class="text-[10px] text-emerald-700 dark:text-emerald-300">Com notas de C1 a C5</div>
                </div>
              </div>
              <span class="text-lg font-black text-emerald-700 dark:text-emerald-400">{{ essayStats.graded }}</span>
            </div>

            <!-- PENDENTES -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800">
              <div class="flex items-center gap-2.5">
                <span class="material-symbols-rounded text-amber-600 dark:text-amber-400">pending</span>
                <div>
                  <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100">Aguardando Avaliação</div>
                  <div class="text-[10px] text-amber-700 dark:text-amber-300">Na fila de professores/IA</div>
                </div>
              </div>
              <span class="text-lg font-black text-amber-700 dark:text-amber-400">{{ essayStats.pending }}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="navigateTo('/admin/redacao')"
          class="w-full mt-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition text-center cursor-pointer shadow-xs shadow-purple-600/20"
        >
          Acessar Gerenciador de Redação →
        </button>
      </div>
    </div>

    <!-- SEÇÃO 4: RESUMO DE USO GLOBAL & ENGAJAMENTO DA PLATAFORMA -->
    <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
      <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <span class="material-symbols-rounded text-indigo-600 dark:text-indigo-400 text-xl">insights</span>
        <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
          Uso Acumulado da Plataforma
        </h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
        <!-- AULAS CONCLUÍDAS -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Aulas Assistidas</span>
          <div class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ platformUsage.completedLessons }}</div>
          <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Em {{ stats.totalLessons }} aulas cadastradas</span>
        </div>

        <!-- QUESTÕES RESOLVIDAS -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Exercícios Feitos</span>
          <div class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ platformUsage.totalQuestionsAnswered }}</div>
          <span class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Simulados & Listas</span>
        </div>

        <!-- REDAÇÕES ENVIADAS -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Redações Feitas</span>
          <div class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ platformUsage.totalEssaysSubmitted }}</div>
          <span class="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold block">Submissões registradas</span>
        </div>

        <!-- MÓDULOS DE CONTEÚDO -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Módulos Pedagógicos</span>
          <div class="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ platformUsage.totalModules }}</div>
          <span class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">Em {{ stats.totalSubjects }} disciplinas</span>
        </div>
      </div>
    </div>
  </div>
</template>
