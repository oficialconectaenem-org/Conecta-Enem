<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Minhas Redações — Área do Aluno | Conecta Enem'
})

const authStore = useAuthStore()

const loading = ref(true)
const essays = ref([])
const activeFilter = ref('ALL') // 'ALL', 'PENDING', 'GRADED'
const searchQuery = ref('')
const selectedEssay = ref(null)
const showCompetenciesModal = ref(false)

async function fetchMyEssays() {
  loading.value = true
  try {
    const res = await $fetch('/api/student/essays', { credentials: 'include' })
    if (res?.essays) {
      essays.value = res.essays
    }
  } catch (err) {
    console.error('Erro ao carregar redações do aluno:', err)
  } finally {
    loading.value = false
  }
}

const filteredEssays = computed(() => {
  return essays.value.filter(essay => {
    // Filtro por status
    if (activeFilter.value === 'PENDING' && essay.status !== 'PENDING') return false
    if (activeFilter.value === 'GRADED' && essay.status !== 'GRADED') return false

    // Filtro por busca de tema ou título
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchTheme = essay.theme?.toLowerCase().includes(q)
      const matchTitle = essay.title?.toLowerCase().includes(q)
      return matchTheme || matchTitle
    }

    return true
  })
})

const stats = computed(() => {
  const total = essays.value.length
  const pending = essays.value.filter(e => e.status === 'PENDING').length
  const graded = essays.value.filter(e => e.status === 'GRADED').length

  const gradedEssays = essays.value.filter(e => e.status === 'GRADED' && e.correction)
  const averageScore = gradedEssays.length > 0
    ? Math.round(gradedEssays.reduce((acc, curr) => acc + (curr.correction.totalScore || 0), 0) / gradedEssays.length)
    : 0

  // Médias por competência (Raio-X)
  const c1Avg = gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, c) => acc + (c.correction.c1Score || 0), 0) / gradedEssays.length) : 0
  const c2Avg = gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, c) => acc + (c.correction.c2Score || 0), 0) / gradedEssays.length) : 0
  const c3Avg = gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, c) => acc + (c.correction.c3Score || 0), 0) / gradedEssays.length) : 0
  const c4Avg = gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, c) => acc + (c.correction.c4Score || 0), 0) / gradedEssays.length) : 0
  const c5Avg = gradedEssays.length > 0 ? Math.round(gradedEssays.reduce((acc, c) => acc + (c.correction.c5Score || 0), 0) / gradedEssays.length) : 0

  return { total, pending, graded, averageScore, c1Avg, c2Avg, c3Avg, c4Avg, c5Avg }
})

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function openEssayDetail(essay) {
  if (essay.submissionType === 'TEXT') {
    navigateTo(`/aluno/redacao/${essay.id}`)
  } else {
    selectedEssay.value = essay
  }
}

onMounted(() => {
  fetchMyEssays()
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-3.5 py-4 sm:px-6 sm:py-8 space-y-6 font-sans">
    <!-- MODAL DE DETALHES DA REDAÇÃO MANUSCRITA / FOTO -->
    <div
      v-if="selectedEssay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-xs"
      @click.self="selectedEssay = null"
    >
      <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--student-border)] bg-[var(--student-surface)] p-5 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <!-- HEADER DO MODAL -->
        <div class="flex items-start justify-between border-b border-[var(--student-border)] pb-3">
          <div class="space-y-1 min-w-0 pr-3">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--student-primary-text)] bg-[var(--student-primary-soft)] px-2.5 py-0.5 rounded-full inline-block">
              {{ selectedEssay.classroom ? `Turma: ${selectedEssay.classroom.name}` : 'Histórico Pessoal' }}
            </span>
            <h3 class="text-sm sm:text-lg font-black text-[var(--student-text)] leading-snug">
              {{ selectedEssay.title || selectedEssay.theme }}
            </h3>
          </div>

          <button
            type="button"
            @click="selectedEssay = null"
            class="h-8 w-8 shrink-0 rounded-full text-[var(--student-text-muted)] hover:bg-[var(--student-surface-secondary)] hover:text-[var(--student-text)] flex items-center justify-center transition cursor-pointer"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- SEÇÃO DE CORREÇÃO DO PROFESSOR (SE ESTIVER AVALIADA) -->
        <div v-if="selectedEssay.status === 'GRADED' && selectedEssay.correction" class="space-y-4">
          <div class="rounded-2xl sm:rounded-3xl bg-linear-to-r from-purple-700 via-purple-600 to-indigo-700 p-5 sm:p-6 text-white shadow-xl shadow-purple-900/10 flex items-center justify-between">
            <div class="space-y-1">
              <span class="text-[11px] font-bold text-purple-200 uppercase tracking-wider block">Nota Oficial ENEM</span>
              <p class="text-xs text-purple-100 font-medium">
                Corrigido por: <strong class="text-white">{{ selectedEssay.correction.teacher?.name || 'Professor' }}</strong>
              </p>
            </div>

            <div class="text-right">
              <span class="text-3xl sm:text-4xl font-black text-white">
                {{ selectedEssay.correction.totalScore }}
              </span>
              <span class="text-[10px] text-purple-200 font-bold block">/ 1000 pts</span>
            </div>
          </div>
        </div>

        <!-- FOTO ENVIADA -->
        <div class="space-y-2 border-t border-[var(--student-border)] pt-3">
          <h4 class="text-xs font-black uppercase tracking-wider text-[var(--student-text-secondary)]">
            Folha Manuscrita Enviada
          </h4>
          <div class="text-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl border border-[var(--student-border)]">
            <img :src="selectedEssay.imageUrl" alt="Folha manuscrita" class="max-h-96 mx-auto rounded-xl object-contain shadow-xs" />
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-[var(--student-border)]">
          <NuxtLink
            :to="`/aluno/redacao/${selectedEssay.id}`"
            class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 transition shadow-xs"
          >
            <span class="material-symbols-rounded text-sm">visibility</span>
            <span>Ver Folha Completa & Correção</span>
          </NuxtLink>

          <button
            type="button"
            @click="selectedEssay = null"
            class="rounded-xl bg-[var(--student-surface-secondary)] px-5 py-2.5 text-xs font-bold text-[var(--student-text)] hover:bg-[var(--student-border)] transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>

    <!-- TOPO DE NAVEGAÇÃO -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <NuxtLink
          to="/aluno/redacao"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--student-primary-text)] hover:underline transition"
        >
          <span class="material-symbols-rounded text-sm">arrow_back</span>
          <span>Voltar ao Menu de Redação</span>
        </NuxtLink>
        <h1 class="text-2xl sm:text-3xl font-black text-[var(--student-text)] tracking-tight">
          Minhas Redações
        </h1>
        <p class="text-xs text-[var(--student-text-secondary)]">
          Acompanhe seu progresso, notas e o feedback detalhado do seu professor.
        </p>
      </div>

      <NuxtLink
        to="/aluno/redacao/nova"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--student-primary-solid)] px-5 py-3 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition cursor-pointer active:scale-98"
      >
        <span class="material-symbols-rounded text-base">add</span>
        <span>Escrever Nova Redação</span>
      </NuxtLink>
    </div>

    <!-- CARDS DE ESTATÍSTICAS DO ALUNO (TOTALMENTE RESPONSIVO MOBILE & DESKTOP) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
      <div class="rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-3.5 sm:p-4 space-y-1 shadow-xs transition hover:border-[var(--student-primary-solid)]">
        <span class="text-[10px] sm:text-[11px] font-bold text-[var(--student-text-secondary)] block">Total Enviadas</span>
        <span class="text-xl sm:text-2xl font-black text-[var(--student-text)]">{{ stats.total }}</span>
      </div>

      <div class="rounded-2xl border border-amber-500/20 bg-[var(--student-card)] p-3.5 sm:p-4 space-y-1 shadow-xs transition hover:border-amber-500">
        <span class="text-[10px] sm:text-[11px] font-bold text-amber-500 block">Aguardando Nota</span>
        <span class="text-xl sm:text-2xl font-black text-amber-500">{{ stats.pending }}</span>
      </div>

      <div class="rounded-2xl border border-purple-500/20 bg-[var(--student-card)] p-3.5 sm:p-4 space-y-1 shadow-xs transition hover:border-purple-500">
        <span class="text-[10px] sm:text-[11px] font-bold text-[var(--student-primary-text)] block">Corrigidas</span>
        <span class="text-xl sm:text-2xl font-black text-[var(--student-primary-text)]">{{ stats.graded }}</span>
      </div>

      <div class="rounded-2xl border border-indigo-500/20 bg-[var(--student-card)] p-3.5 sm:p-4 space-y-1 shadow-xs transition hover:border-indigo-500">
        <span class="text-[10px] sm:text-[11px] font-bold text-indigo-400 block">Média Geral</span>
        <span class="text-xl sm:text-2xl font-black text-indigo-400">{{ stats.averageScore }} <span class="text-[11px] text-[var(--student-text-muted)] font-normal">pts</span></span>
      </div>
    </div>

    <!-- RAIO-X DAS 5 COMPETÊNCIAS DO ENEM (DESTAQUE PEDAGÓGICO) -->
    <div v-if="stats.graded > 0" class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-4 sm:p-5 shadow-xs space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-purple-600 text-lg">insights</span>
          <h3 class="text-xs font-black uppercase tracking-wider text-[var(--student-text)]">
            Raio-X das Competências ENEM (Suas Médias)
          </h3>
        </div>
        <span class="text-[11px] font-bold text-[var(--student-text-secondary)]">Base: {{ stats.graded }} correções</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        <div class="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span class="text-[10px] font-bold text-slate-500 block truncate" title="C1: Norma Culta">C1 - Norma Culta</span>
          <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ stats.c1Avg }} <span class="text-[9px] font-normal text-slate-400">pts</span></span>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span class="text-[10px] font-bold text-slate-500 block truncate" title="C2: Tema e Repertório">C2 - Repertório</span>
          <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ stats.c2Avg }} <span class="text-[9px] font-normal text-slate-400">pts</span></span>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span class="text-[10px] font-bold text-slate-500 block truncate" title="C3: Argumentação">C3 - Argumentação</span>
          <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ stats.c3Avg }} <span class="text-[9px] font-normal text-slate-400">pts</span></span>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span class="text-[10px] font-bold text-slate-500 block truncate" title="C4: Coesão">C4 - Coesão</span>
          <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ stats.c4Avg }} <span class="text-[9px] font-normal text-slate-400">pts</span></span>
        </div>
        <div class="col-span-2 sm:col-span-1 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span class="text-[10px] font-bold text-slate-500 block truncate" title="C5: Proposta de Intervenção">C5 - Proposta</span>
          <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ stats.c5Avg }} <span class="text-[9px] font-normal text-slate-400">pts</span></span>
        </div>
      </div>
    </div>

    <!-- BARRA DE PESQUISA & FILTROS (MOBILE-FRIENDLY) -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
      <!-- Filtros por status -->
      <div class="flex items-center gap-1 p-1 bg-[var(--student-surface-secondary)] border border-[var(--student-border)] rounded-2xl w-full sm:w-auto overflow-x-auto">
        <button
          type="button"
          @click="activeFilter = 'ALL'"
          class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap text-center"
          :class="activeFilter === 'ALL' ? 'bg-[var(--student-primary-solid)] text-white shadow-xs' : 'text-[var(--student-text-secondary)] hover:text-[var(--student-text)]'"
        >
          Todas ({{ stats.total }})
        </button>

        <button
          type="button"
          @click="activeFilter = 'PENDING'"
          class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap text-center"
          :class="activeFilter === 'PENDING' ? 'bg-[var(--student-primary-solid)] text-white shadow-xs' : 'text-[var(--student-text-secondary)] hover:text-[var(--student-text)]'"
        >
          Pendentes ({{ stats.pending }})
        </button>

        <button
          type="button"
          @click="activeFilter = 'GRADED'"
          class="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap text-center"
          :class="activeFilter === 'GRADED' ? 'bg-[var(--student-primary-solid)] text-white shadow-xs' : 'text-[var(--student-text-secondary)] hover:text-[var(--student-text)]'"
        >
          Corrigidas ({{ stats.graded }})
        </button>
      </div>

      <!-- Busca por tema/título -->
      <div class="relative w-full sm:w-72">
        <span class="material-symbols-rounded absolute left-3.5 top-2.5 text-[var(--student-text-muted)] text-lg">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar redação por tema..."
          class="w-full rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] py-2 pl-10 pr-4 text-xs text-[var(--student-text)] placeholder-[var(--student-text-muted)] outline-none focus:border-[var(--student-primary-solid)] transition"
        />
      </div>
    </div>

    <!-- LISTAGEM DE REDAÇÕES -->
    <div v-if="loading" class="py-16 text-center">
      <span class="material-symbols-rounded animate-spin text-3xl text-[var(--student-primary-text)]">progress_activity</span>
      <p class="mt-2 text-xs font-bold text-[var(--student-text-secondary)]">Carregando suas redações...</p>
    </div>

    <div v-else-if="filteredEssays.length === 0" class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-8 sm:p-12 text-center space-y-3">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)]">
        <span class="material-symbols-rounded text-3xl">description</span>
      </div>
      <h3 class="text-base font-bold text-[var(--student-text)]">Nenhuma redação encontrada</h3>
      <p class="text-xs text-[var(--student-text-secondary)] max-w-sm mx-auto">
        {{ searchQuery ? 'Nenhuma redação corresponde aos termos da busca.' : 'Você ainda não enviou redações nesta categoria. Comece a praticar agora mesmo!' }}
      </p>
      <NuxtLink
        v-if="!searchQuery"
        to="/aluno/redacao/nova"
        class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--student-primary-solid)] px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition"
      >
        <span class="material-symbols-rounded text-sm">edit</span>
        <span>Escrever Nova Redação</span>
      </NuxtLink>
    </div>

    <!-- CARDS DE REDAÇÕES OTIMIZADOS PARA MOBILE E DESKTOP -->
    <div v-else class="space-y-3">
      <div
        v-for="essay in filteredEssays"
        :key="essay.id"
        @click="openEssayDetail(essay)"
        class="group rounded-2xl sm:rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-4 sm:p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--student-primary-solid)] hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
      >
        <div class="space-y-2 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full"
              :class="essay.status === 'GRADED' ? 'bg-[var(--student-primary-soft)] text-[var(--student-primary-text)]' : 'bg-amber-500/15 text-amber-500'"
            >
              {{ essay.status === 'GRADED' ? 'Corrigida' : 'Aguardando Correção' }}
            </span>

            <span class="text-[11px] text-[var(--student-text-muted)]">
              {{ formatDate(essay.createdAt) }}
            </span>

            <span v-if="essay.classroom" class="text-[11px] font-bold text-[var(--student-text-secondary)] flex items-center gap-1">
              <span class="material-symbols-rounded text-xs">school</span>
              <span class="truncate max-w-[140px]">{{ essay.classroom.name }}</span>
            </span>
          </div>

          <h3 class="text-sm sm:text-base font-bold text-[var(--student-text)] group-hover:text-[var(--student-primary-text)] transition leading-snug line-clamp-2">
            {{ essay.title || essay.theme }}
          </h3>
          <p v-if="essay.title" class="text-xs text-[var(--student-text-secondary)] line-clamp-1">
            Tema: {{ essay.theme }}
          </p>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-0 border-[var(--student-border)]">
          <!-- Nota em destaque se corrigida -->
          <div v-if="essay.status === 'GRADED' && essay.correction" class="text-left sm:text-right">
            <span class="text-2xl font-black text-[var(--student-primary-text)]">{{ essay.correction.totalScore }}</span>
            <span class="text-[10px] text-[var(--student-text-muted)] font-bold block sm:inline sm:ml-1">pts</span>
          </div>

          <div class="flex items-center gap-1 text-xs font-bold text-[var(--student-primary-text)] group-hover:translate-x-1 transition">
            <span>{{ essay.status === 'GRADED' ? 'Ver Correção' : 'Ver Texto' }}</span>
            <span class="material-symbols-rounded text-lg">chevron_right</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

