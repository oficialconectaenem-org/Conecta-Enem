<script setup>
import EssayToolbar from '~/components/essay/EssayToolbar.vue'
import EssayDocument from '~/components/essay/EssayDocument.vue'
import EssayCommentsPanel from '~/components/essay/EssayCommentsPanel.vue'
import EssayCompetencies from '~/components/essay/EssayCompetencies.vue'
import { calculateEssayMetrics } from '#shared/utils/essay-metrics'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const essayId = route.params.id

useSeoMeta({
  title: 'Visualizar Redação & Correção — Área do Aluno'
})

const loading = ref(true)
const essay = ref(null)
const essayMetrics = computed(() => calculateEssayMetrics(essay.value?.content || '', essay.value?.title || ''))
const annotations = ref([])
const showAnnotations = ref(true)
const showCommentsMobileDrawer = ref(false)
const zoom = ref(100)
const selectedAnnotation = ref(null)
const activeView = ref('document') // 'document', 'rubric'

async function loadEssay() {
  loading.value = true
  try {
    const res = await $fetch(`/api/student/essays/${essayId}`, {
      credentials: 'include'
    })

    if (res?.success && res.essay) {
      essay.value = res.essay
      annotations.value = res.essay.annotations || []
    }
  } catch (err) {
    console.error('Erro ao carregar redação:', err)
  } finally {
    loading.value = false
  }
}

const competenciesData = computed(() => {
  if (!essay.value?.correction) {
    return {
      c1Score: 0,
      c2Score: 0,
      c3Score: 0,
      c4Score: 0,
      c5Score: 0,
      justification1: '',
      justification2: '',
      justification3: '',
      justification4: '',
      justification5: '',
      positivePoints: '',
      improvements: '',
      generalComment: ''
    }
  }
  const c = essay.value.correction
  return {
    c1Score: c.c1Score,
    c2Score: c.c2Score,
    c3Score: c.c3Score,
    c4Score: c.c4Score,
    c5Score: c.c5Score,
    justification1: c.justification1 || c.c1Comment,
    justification2: c.justification2 || c.c2Comment,
    justification3: c.justification3 || c.c3Comment,
    justification4: c.justification4 || c.c4Comment,
    justification5: c.justification5 || c.c5Comment,
    positivePoints: c.positivePoints,
    improvements: c.improvements,
    generalComment: c.generalComment || c.generalFeedback
  }
})

function handleZoomIn() {
  if (zoom.value < 150) zoom.value += 10
}

function handleZoomOut() {
  if (zoom.value > 70) zoom.value -= 10
}

function handleZoomReset() {
  zoom.value = 100
}

onMounted(() => {
  loadEssay()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-100 dark:bg-zinc-950 font-sans transition-colors duration-200">
    <!-- Topbar Unificada e Responsiva do Aluno -->
    <header class="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 shadow-xs transition-colors duration-200">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <!-- Lado Esquerdo: Botão Voltar & Info da Redação -->
        <div class="flex items-center gap-2.5 min-w-0">
          <NuxtLink
            to="/aluno/redacao/minhas"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-800 dark:hover:text-zinc-100 transition"
            title="Voltar às minhas redações"
          >
            <span class="material-symbols-rounded text-xl">arrow_back</span>
          </NuxtLink>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                {{ essay?.title || essay?.theme || 'Redação' }}
              </h1>
              <span
                class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
                :class="essay?.status === 'GRADED' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'"
              >
                {{ essay?.status === 'GRADED' ? 'Corrigida' : 'Aguardando' }}
              </span>

              <!-- Badges de Métricas Oficiais -->
              <div v-if="essay?.content" class="hidden md:flex items-center gap-1.5 ml-1">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                  :class="essayMetrics.lines > 30 ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' : essayMetrics.lines >= 8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'"
                  :title="essayMetrics.linesStatus.badge"
                >
                  {{ essayMetrics.lines }} linhas
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" :title="essayMetrics.paragraphStatus.badge">
                  {{ essayMetrics.paragraphs }} parágrafos
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                  {{ essayMetrics.words }} palavras
                </span>
              </div>
              <div v-else-if="essay?.submissionType === 'IMAGE' || essay?.imageUrl" class="hidden sm:flex items-center gap-1.5 ml-1">
                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                  <span class="material-symbols-rounded text-xs">photo_camera</span>
                  <span>Foto Manuscrita</span>
                </span>
              </div>
            </div>
            <p v-if="essay?.theme" class="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-xs sm:max-w-md">
              Tema: {{ essay.theme }}
            </p>
          </div>
        </div>

        <!-- Lado Direito: Alternar Abas e Nota Oficial -->
        <div class="flex items-center gap-2 shrink-0">
          <div v-if="essay?.status === 'GRADED' && essay?.correction" class="hidden sm:flex items-center gap-1.5 rounded-xl bg-purple-600 px-2.5 py-1 text-white shadow-xs">
            <span class="text-[9px] font-bold text-purple-200 uppercase">Nota</span>
            <span class="text-xs font-black">{{ essay.correction.totalScore }} / 1000</span>
          </div>

          <div class="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
            <button
              type="button"
              @click="activeView = 'document'"
              class="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              :class="activeView === 'document' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
            >
              <span class="material-symbols-rounded text-sm">{{ essay?.submissionType === 'IMAGE' || essay?.imageUrl ? 'photo_camera' : 'edit_document' }}</span>
              <span class="hidden sm:inline">{{ essay?.submissionType === 'IMAGE' || essay?.imageUrl ? 'Folha / Foto' : 'Folha Pautada' }}</span>
            </button>

            <!-- Aba Direta de Correções & Comentários (Visível no Mobile e Desktop) -->
            <button
              type="button"
              @click="activeView = 'comments'"
              class="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              :class="activeView === 'comments' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
            >
              <span class="material-symbols-rounded text-sm">fact_check</span>
              <span>Anotações</span>
              <span v-if="annotations.length > 0" class="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 ml-0.5">
                {{ annotations.length }}
              </span>
            </button>

            <button
              type="button"
              @click="activeView = 'rubric'"
              class="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              :class="activeView === 'rubric' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'"
            >
              <span class="material-symbols-rounded text-sm">assignment</span>
              <span class="hidden sm:inline">Critérios & Nota</span>
            </button>
          </div>

          <CommonThemeToggle />
        </div>
      </div>

      <!-- Barra de Ferramentas Inline no Mobile e Desktop (Ocultar/Mostrar Marcações e Zoom) -->
      <div v-if="activeView === 'document'" class="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto">
        <!-- Toggle Marcações -->
        <button
          type="button"
          @click="showAnnotations = !showAnnotations"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border"
          :class="showAnnotations ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'"
        >
          <span class="material-symbols-rounded text-[16px]">{{ showAnnotations ? 'visibility' : 'visibility_off' }}</span>
          <span>{{ showAnnotations ? 'Ocultar Marcações' : 'Mostrar Marcações' }}</span>
        </button>

        <!-- Controles de Zoom -->
        <div class="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700/60 shrink-0">
          <button
            type="button"
            title="Diminuir Zoom"
            @click="handleZoomOut"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <span class="material-symbols-rounded text-sm">remove</span>
          </button>
          <button
            type="button"
            title="Resetar Zoom"
            @click="handleZoomReset"
            class="px-2 text-[11px] font-black text-slate-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-400 transition cursor-pointer"
          >
            {{ zoom }}%
          </button>
          <button
            type="button"
            title="Aumentar Zoom"
            @click="handleZoomIn"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <span class="material-symbols-rounded text-sm">add</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Corpo Central -->
    <div class="flex-1 flex overflow-hidden relative min-h-0">
      <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
        <span class="material-symbols-rounded animate-spin text-4xl text-purple-600">progress_activity</span>
        <p class="mt-3 text-xs font-bold text-slate-500 dark:text-zinc-400">Carregando sua redação e correções...</p>
      </div>

      <!-- VISÃO 1: FOLHA PAUTADA + MARCAÇÕES DO PROFESSOR -->
      <template v-else-if="activeView === 'document'">
        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-slate-100 dark:bg-zinc-950 p-4 sm:p-8 transition-colors duration-200">
          <div
            class="transition-transform duration-150 origin-top flex justify-center w-full min-h-full pb-28"
            :style="{ transform: `scale(${zoom / 100})` }"
          >
            <EssayDocument
              :content="essay?.content || ''"
              :image-url="essay?.imageUrl"
              :submission-type="essay?.submissionType || (essay?.imageUrl ? 'IMAGE' : 'TEXT')"
              :title="essay?.title || ''"
              :theme="essay?.theme || ''"
              :annotations="annotations"
              :read-only="true"
              :show-annotations="showAnnotations"
              :selected-annotation-id="selectedAnnotation?.id"
              @select-annotation="selectedAnnotation = $event"
            />
          </div>
        </div>

        <!-- Sidebar de Comentários para o Aluno (Desktop) -->
        <aside class="w-80 shrink-0 hidden lg:block h-full">
          <EssayCommentsPanel
            :annotations="annotations"
            :selected-annotation-id="selectedAnnotation?.id"
            :read-only="true"
            @select-annotation="selectedAnnotation = $event"
          />
        </aside>

        <!-- Botão Flutuante de Comentários para Mobile/Tablet -->
        <button
          type="button"
          @click="showCommentsMobileDrawer = true"
          class="lg:hidden fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-xs font-black text-white shadow-xl shadow-purple-900/20 active:scale-95 transition"
        >
          <span class="material-symbols-rounded text-base">fact_check</span>
          <span>Anotações ({{ annotations.length }})</span>
        </button>
      </template>

      <!-- VISÃO 2: LISTA DE CORREÇÕES & COMENTÁRIOS (DIRETO PARA MOBILE/TABLET/DESKTOP) -->
      <div v-else-if="activeView === 'comments'" class="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-zinc-950 flex justify-center transition-colors duration-200">
        <div class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 sm:p-6 transition-colors duration-200">
          <EssayCommentsPanel
            :annotations="annotations"
            :selected-annotation-id="selectedAnnotation?.id"
            :read-only="true"
            @select-annotation="selectedAnnotation = $event"
          />
        </div>
      </div>

      <!-- VISÃO 3: NOTAS POR COMPETÊNCIA E FEEDBACK PEDAGÓGICO -->
      <div v-else class="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-zinc-950 flex justify-center transition-colors duration-200">
        <div class="w-full max-w-4xl">
          <EssayCompetencies
            :model-value="competenciesData"
            :read-only="true"
          />
        </div>
      </div>
    </div>

    <!-- Drawer Lateral de Comentários para Mobile/Tablet do Aluno -->
    <Teleport to="body">
      <div v-if="showCommentsMobileDrawer" class="fixed inset-0 z-50 flex justify-end">
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs transition-opacity duration-200"
          @click="showCommentsMobileDrawer = false"
        ></div>
        <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-250">
          <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900">
            <div class="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <span class="material-symbols-rounded text-xl">fact_check</span>
              <h3 class="text-sm font-black text-slate-900 dark:text-zinc-100">Anotações do Professor</h3>
            </div>
            <button
              type="button"
              @click="showCommentsMobileDrawer = false"
              class="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <EssayCommentsPanel
              :annotations="annotations"
              :selected-annotation-id="selectedAnnotation?.id"
              :read-only="true"
              @select-annotation="selectedAnnotation = $event; showCommentsMobileDrawer = false"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
