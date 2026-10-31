<script setup>
import EssayToolbar from '~/components/essay/EssayToolbar.vue'
import EssayDocument from '~/components/essay/EssayDocument.vue'
import EssayCommentsPanel from '~/components/essay/EssayCommentsPanel.vue'
import EssayCompetencies from '~/components/essay/EssayCompetencies.vue'
import EssayCommentModal from '~/components/essay/EssayCommentModal.vue'
import { calculateEssayMetrics } from '#shared/utils/essay-metrics'

definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

const route = useRoute()
const router = useRouter()
const essayId = route.params.id

useSeoMeta({
  title: 'Estúdio de Correção de Redação — Conecta Enem'
})

// Estados da Redação
const loading = ref(true)
const essay = ref(null)
const essayMetrics = computed(() => calculateEssayMetrics(essay.value?.content || '', essay.value?.title || ''))
const annotations = ref([])
const history = ref([])
const historyIndex = ref(-1)

// Estados de Ferramentas
const activeTool = ref('select')
const activeColor = ref('#dc2626')
const activeStrokeWidth = ref(3)
const zoom = ref(100)
const showAnnotations = ref(true)
const selectedAnnotation = ref(null)

// Modos de Layout
// Desktop: 'split' (Lado a Lado: Foto à esquerda, Notas à direita), 'document' (Apenas Foto/Folha), 'rubric' (Apenas Notas)
// Mobile: 'document' ou 'rubric'
const viewLayoutMode = ref('split')
const showCommentsMobileDrawer = ref(false)
const showCommentModal = ref(false)
const pendingCommentData = ref(null)

// Formulário de Competências
const competenciesForm = ref({
  c1Score: 160,
  c2Score: 160,
  c3Score: 160,
  c4Score: 160,
  c5Score: 160,
  justification1: '',
  justification2: '',
  justification3: '',
  justification4: '',
  justification5: '',
  positivePoints: '',
  improvements: '',
  generalComment: ''
})

// Cálculo Automático da Nota Total Oficial
const totalScore = computed(() => {
  return (
    Number(competenciesForm.value.c1Score || 0) +
    Number(competenciesForm.value.c2Score || 0) +
    Number(competenciesForm.value.c3Score || 0) +
    Number(competenciesForm.value.c4Score || 0) +
    Number(competenciesForm.value.c5Score || 0)
  )
})

// Autosave & Finalização
const savingStatus = ref('saved') // 'saved', 'saving', 'unsaved', 'error'
const finalizing = ref(false)
const showFinalizeConfirm = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

let autosaveTimer = null

function showToast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

// Carregar Dados da Redação
async function loadEssay() {
  loading.value = true
  try {
    const res = await $fetch(`/api/teacher/essays/${essayId}`, {
      credentials: 'include'
    })

    if (res?.success && res.essay) {
      essay.value = res.essay
      annotations.value = res.essay.annotations || []
      saveHistorySnapshot()

      if (res.essay.correction) {
        const c = res.essay.correction
        competenciesForm.value = {
          c1Score: c.c1Score ?? 160,
          c2Score: c.c2Score ?? 160,
          c3Score: c.c3Score ?? 160,
          c4Score: c.c4Score ?? 160,
          c5Score: c.c5Score ?? 160,
          justification1: c.justification1 || c.c1Comment || '',
          justification2: c.justification2 || c.c2Comment || '',
          justification3: c.justification3 || c.c3Comment || '',
          justification4: c.justification4 || c.c4Comment || '',
          justification5: c.justification5 || c.c5Comment || '',
          positivePoints: c.positivePoints || '',
          improvements: c.improvements || '',
          generalComment: c.generalComment || c.generalFeedback || ''
        }
      }
    }
  } catch (err) {
    showToast('Erro ao carregar dados da redação.', 'error')
  } finally {
    loading.value = false
  }
}

// Histórico para Undo/Redo
function saveHistorySnapshot() {
  const snapshot = JSON.stringify(annotations.value)
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(snapshot)
  historyIndex.value = history.value.length - 1
}

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

function handleUndo() {
  if (!canUndo.value) return
  historyIndex.value--
  annotations.value = JSON.parse(history.value[historyIndex.value])
  triggerAutosave()
}

function handleRedo() {
  if (!canRedo.value) return
  historyIndex.value++
  annotations.value = JSON.parse(history.value[historyIndex.value])
  triggerAutosave()
}

// Zoom Handlers
function handleZoomIn() {
  if (zoom.value < 200) zoom.value += 15
}
function handleZoomOut() {
  if (zoom.value > 50) zoom.value -= 15
}
function handleZoomReset() {
  zoom.value = 100
}

// Adicionar / Remover Anotação
function handleAddAnnotation(newAnn) {
  annotations.value.push(newAnn)
  saveHistorySnapshot()
  triggerAutosave()
}

function handleRemoveAnnotation(annId) {
  annotations.value = annotations.value.filter((a) => a.id !== annId)
  saveHistorySnapshot()
  triggerAutosave()
}

function handleSelectAnnotation(ann) {
  selectedAnnotation.value = ann
}

// Comentários Marginais
function handleOpenCommentModal(data) {
  pendingCommentData.value = data
  showCommentModal.value = true
}

function handleSaveComment({ content, category, correctionText }) {
  if (!pendingCommentData.value) return

  const isCorrection = pendingCommentData.value.isCorrectionMode || !!correctionText

  const newAnn = {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: isCorrection ? 'STRIKE' : 'COMMENT',
    category,
    content: correctionText || content,
    color: isCorrection ? '#dc2626' : '#7c3aed',
    selectedText: pendingCommentData.value.selectedText,
    startOffset: pendingCommentData.value.startOffset,
    endOffset: pendingCommentData.value.endOffset
  }

  handleAddAnnotation(newAnn)
  showCommentModal.value = false
  pendingCommentData.value = null
}

// Autosave das Anotações e Rascunho das Notas
function triggerAutosave() {
  savingStatus.value = 'unsaved'
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(async () => {
    await performAutosave()
  }, 1500)
}

async function performAutosave() {
  savingStatus.value = 'saving'
  try {
    // 1. Salvar Anotações
    await $fetch(`/api/teacher/essays/${essayId}/annotations`, {
      method: 'POST',
      credentials: 'include',
      body: {
        annotations: annotations.value
      }
    })

    // 2. Salvar Rascunho da Correção
    await $fetch(`/api/teacher/essays/${essayId}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        ...competenciesForm.value,
        status: essay.value?.status === 'GRADED' ? 'GRADED' : 'CORRECTING'
      }
    })

    savingStatus.value = 'saved'
  } catch (err) {
    savingStatus.value = 'error'
    console.error('Erro no autosave:', err)
  }
}

// Finalizar Avaliação Oficial
async function finalizeCorrection() {
  finalizing.value = true
  try {
    await $fetch(`/api/teacher/essays/${essayId}/finalize`, {
      method: 'POST',
      credentials: 'include',
      body: {
        ...competenciesForm.value,
        annotations: annotations.value
      }
    })

    showFinalizeConfirm.value = false
    showToast('Correção concluída e nota publicada com sucesso!', 'success')

    setTimeout(() => {
      router.push('/professor/redacoes')
    }, 1200)
  } catch (err) {
    showToast(err.data?.message || 'Erro ao finalizar correção.', 'error')
  } finally {
    finalizing.value = false
  }
}

// Teclas de Atalho (Ctrl+Z, Ctrl+Shift+Z)
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (e.shiftKey) {
      e.preventDefault()
      handleRedo()
    } else {
      e.preventDefault()
      handleUndo()
    }
  }
}

onMounted(() => {
  loadEssay()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearTimeout(autosaveTimer)
})
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-100 dark:bg-zinc-950 overflow-hidden font-sans transition-colors duration-200">
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

    <!-- TOPBAR PRINCIPAL DO ESTÚDIO -->
    <header class="h-14 shrink-0 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-6 flex items-center justify-between z-40 transition-colors duration-200">
      <!-- Lado Esquerdo: Voltar & Aluno -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <NuxtLink
          to="/professor/redacoes"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-800 dark:hover:text-zinc-100 transition shrink-0"
          title="Voltar à lista"
        >
          <span class="material-symbols-rounded text-xl">arrow_back</span>
        </NuxtLink>

        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-xs sm:text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
              {{ essay?.student?.name || 'Carregando Aluno...' }}
            </h1>
            <span
              v-if="essay?.classroom"
              class="hidden sm:inline-block text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/50 truncate max-w-[140px]"
            >
              {{ essay.classroom.name }}
            </span>

            <!-- Badge Foto vs Texto -->
            <span
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
              :class="essay?.submissionType === 'IMAGE' || essay?.imageUrl ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'"
            >
              <span class="material-symbols-rounded text-xs">{{ essay?.submissionType === 'IMAGE' || essay?.imageUrl ? 'photo_camera' : 'edit_document' }}</span>
              <span class="hidden md:inline">{{ essay?.submissionType === 'IMAGE' || essay?.imageUrl ? 'Foto Manuscrita' : 'Digitada' }}</span>
            </span>
          </div>
          <p class="text-[11px] text-slate-400 dark:text-zinc-500 truncate max-w-xs sm:max-w-md">
            {{ essay?.theme || essay?.title || 'Tema da Redação' }}
          </p>
        </div>
      </div>

      <!-- Centro / Lado Direito: Modos de Visão & Finalizar -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Badge da Nota Total em Tempo Real -->
        <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-black">
          <span class="text-slate-400 text-[10px] font-bold uppercase hidden sm:inline">Nota:</span>
          <span class="text-sm font-black text-purple-700 dark:text-purple-400">{{ totalScore }}</span>
          <span class="text-[10px] text-slate-400">/ 1000</span>
        </div>

        <!-- 1. CONTROLE DE LAYOUT PARA DESKTOP (hidden lg:flex) -->
        <div class="hidden lg:flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
          <button
            type="button"
            @click="viewLayoutMode = 'split'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewLayoutMode === 'split' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'"
            title="Ver Foto/Folha à esquerda e 5 Competências à direita ao mesmo tempo"
          >
            <span class="material-symbols-rounded text-sm">view_sidebar</span>
            <span>Lado a Lado</span>
          </button>

          <button
            type="button"
            @click="viewLayoutMode = 'document'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewLayoutMode === 'document' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'"
            title="Focar apenas na leitura e marcação da foto"
          >
            <span class="material-symbols-rounded text-sm">photo_camera</span>
            <span>Apenas Foto</span>
          </button>

          <button
            type="button"
            @click="viewLayoutMode = 'rubric'"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewLayoutMode === 'rubric' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'"
            title="Focar na atribuição das 5 notas e justificativas"
          >
            <span class="material-symbols-rounded text-sm">rubric</span>
            <span>Apenas Notas</span>
          </button>
        </div>

        <!-- 2. CONTROLE DE ABAS PARA MOBILE (lg:hidden) -->
        <div class="flex lg:hidden items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
          <button
            type="button"
            @click="viewLayoutMode = 'document'"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewLayoutMode !== 'rubric' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400'"
          >
            <span class="material-symbols-rounded text-sm">photo_camera</span>
            <span>Foto</span>
          </button>

          <button
            type="button"
            @click="viewLayoutMode = 'rubric'"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="viewLayoutMode === 'rubric' ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs font-black' : 'text-slate-600 dark:text-zinc-400'"
          >
            <span class="material-symbols-rounded text-sm">grade</span>
            <span>Notas</span>
          </button>
        </div>

        <!-- Botão Finalizar Correção -->
        <button
          type="button"
          @click="showFinalizeConfirm = true"
          class="flex items-center gap-1.5 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 transition cursor-pointer active:scale-98 shrink-0"
        >
          <span class="material-symbols-rounded text-sm">verified</span>
          <span class="hidden sm:inline">Finalizar & Publicar</span>
          <span class="sm:hidden">Publicar</span>
        </button>
      </div>
    </header>

    <!-- CORPO PRINCIPAL DO ESTÚDIO DE CORREÇÃO -->
    <div class="flex-1 flex overflow-hidden relative min-h-0">
      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
        <span class="material-symbols-rounded animate-spin text-4xl text-purple-600">progress_activity</span>
        <p class="mt-3 text-xs font-bold text-slate-500 dark:text-zinc-400">Carregando estúdio de correção...</p>
      </div>

      <!-- CENÁRIO A: MODO LADO A LADO (SPLIT-SCREEN) NO DESKTOP -->
      <template v-else-if="viewLayoutMode === 'split'">
        <!-- COLUNA ESQUERDA: FOTO DA REDAÇÃO / DOCUMENTO COM BARRA DE FERRAMENTAS (58% de largura) -->
        <div class="hidden lg:flex w-[58%] h-full flex-col border-r border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 min-h-0 overflow-hidden">
          <EssayToolbar
            v-model:active-tool="activeTool"
            v-model:active-color="activeColor"
            v-model:active-stroke-width="activeStrokeWidth"
            v-model:show-annotations="showAnnotations"
            :can-undo="canUndo"
            :can-redo="canRedo"
            :zoom="zoom"
            :saving-status="savingStatus"
            @undo="handleUndo"
            @redo="handleRedo"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @zoom-reset="handleZoomReset"
          />

          <div class="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 sm:p-5">
            <div
              class="transition-transform duration-150 origin-top flex justify-center w-full min-h-full pb-20"
              :style="{ transform: `scale(${zoom / 100})` }"
            >
              <EssayDocument
                :content="essay?.content || ''"
                :image-url="essay?.imageUrl"
                :submission-type="essay?.submissionType || (essay?.imageUrl ? 'IMAGE' : 'TEXT')"
                :title="essay?.title || ''"
                :theme="essay?.theme || ''"
                :annotations="annotations"
                :active-tool="activeTool"
                :active-color="activeColor"
                :active-stroke-width="activeStrokeWidth"
                :show-annotations="showAnnotations"
                :selected-annotation-id="selectedAnnotation?.id"
                @add-annotation="handleAddAnnotation"
                @remove-annotation="handleRemoveAnnotation"
                @select-annotation="handleSelectAnnotation"
                @open-comment-modal="handleOpenCommentModal"
              />
            </div>
          </div>
        </div>

        <!-- COLUNA DIREITA: MATRIZ DE 5 COMPETÊNCIAS ENEM (42% de largura) -->
        <div class="hidden lg:block w-[42%] h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-zinc-900/60 min-h-0">
          <div class="space-y-4 max-w-xl mx-auto">
            <!-- Header do Resumo da Avaliação -->
            <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
              <div>
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Nota Total da Redação</span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-3xl font-black text-purple-700 dark:text-purple-400">{{ totalScore }}</span>
                  <span class="text-xs font-bold text-slate-400">/ 1000 pts</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  {{ annotations.length }} anotação(ões) na folha
                </span>
              </div>
            </div>

            <!-- Grade Oficial de Competências -->
            <EssayCompetencies
              v-model="competenciesForm"
              @change="triggerAutosave"
            />
          </div>
        </div>

        <!-- Fallback para telas menores (se estiver em split mas tela for mobile) -->
        <div class="lg:hidden flex-1 h-full flex flex-col min-h-0 overflow-hidden">
          <EssayToolbar
            v-model:active-tool="activeTool"
            v-model:active-color="activeColor"
            v-model:active-stroke-width="activeStrokeWidth"
            v-model:show-annotations="showAnnotations"
            :can-undo="canUndo"
            :can-redo="canRedo"
            :zoom="zoom"
            :saving-status="savingStatus"
            @undo="handleUndo"
            @redo="handleRedo"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @zoom-reset="handleZoomReset"
          />

          <div class="flex-1 min-h-0 overflow-y-auto p-2">
            <div
              class="transition-transform duration-150 origin-top flex justify-center w-full min-h-full pb-20"
              :style="{ transform: `scale(${zoom / 100})` }"
            >
              <EssayDocument
                :content="essay?.content || ''"
                :image-url="essay?.imageUrl"
                :submission-type="essay?.submissionType || (essay?.imageUrl ? 'IMAGE' : 'TEXT')"
                :title="essay?.title || ''"
                :theme="essay?.theme || ''"
                :annotations="annotations"
                :active-tool="activeTool"
                :active-color="activeColor"
                :active-stroke-width="activeStrokeWidth"
                :show-annotations="showAnnotations"
                :selected-annotation-id="selectedAnnotation?.id"
                @add-annotation="handleAddAnnotation"
                @remove-annotation="handleRemoveAnnotation"
                @select-annotation="handleSelectAnnotation"
                @open-comment-modal="handleOpenCommentModal"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- CENÁRIO B: MODO DOCUMENTO (APENAS FOTO/FOLHA EM TELA CHEIA) -->
      <template v-else-if="viewLayoutMode === 'document'">
        <div class="flex-1 h-full flex flex-col min-h-0 overflow-hidden bg-slate-100 dark:bg-zinc-950">
          <EssayToolbar
            v-model:active-tool="activeTool"
            v-model:active-color="activeColor"
            v-model:active-stroke-width="activeStrokeWidth"
            v-model:show-annotations="showAnnotations"
            :can-undo="canUndo"
            :can-redo="canRedo"
            :zoom="zoom"
            :saving-status="savingStatus"
            @undo="handleUndo"
            @redo="handleRedo"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @zoom-reset="handleZoomReset"
          />

          <div class="flex-1 flex overflow-hidden min-h-0">
            <!-- Área da Foto / Documento -->
            <div class="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2 sm:p-6">
              <div
                class="transition-transform duration-150 origin-top flex justify-center w-full min-h-full pb-24"
                :style="{ transform: `scale(${zoom / 100})` }"
              >
                <EssayDocument
                  :content="essay?.content || ''"
                  :image-url="essay?.imageUrl"
                  :submission-type="essay?.submissionType || (essay?.imageUrl ? 'IMAGE' : 'TEXT')"
                  :title="essay?.title || ''"
                  :theme="essay?.theme || ''"
                  :annotations="annotations"
                  :active-tool="activeTool"
                  :active-color="activeColor"
                  :active-stroke-width="activeStrokeWidth"
                  :show-annotations="showAnnotations"
                  :selected-annotation-id="selectedAnnotation?.id"
                  @add-annotation="handleAddAnnotation"
                  @remove-annotation="handleRemoveAnnotation"
                  @select-annotation="handleSelectAnnotation"
                  @open-comment-modal="handleOpenCommentModal"
                />
              </div>
            </div>

            <!-- Painel Lateral de Comentários no Desktop -->
            <aside class="w-80 shrink-0 hidden lg:block h-full border-l border-slate-200 dark:border-zinc-800">
              <EssayCommentsPanel
                :annotations="annotations"
                :selected-annotation-id="selectedAnnotation?.id"
                @select-annotation="handleSelectAnnotation"
                @remove-annotation="handleRemoveAnnotation"
              />
            </aside>
          </div>
        </div>

        <!-- Botão Flutuante de Comentários no Mobile -->
        <button
          type="button"
          @click="showCommentsMobileDrawer = true"
          class="lg:hidden fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-xs font-black text-white shadow-xl shadow-purple-900/20 active:scale-95 transition"
        >
          <span class="material-symbols-rounded text-base">fact_check</span>
          <span>Anotações ({{ annotations.length }})</span>
        </button>

        <!-- Botão Flutuante para Avaliar Notas no Mobile -->
        <button
          type="button"
          @click="viewLayoutMode = 'rubric'"
          class="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-xl shadow-indigo-900/20 active:scale-95 transition"
        >
          <span class="material-symbols-rounded text-base">grade</span>
          <span>Dar Notas ({{ totalScore }} pts)</span>
        </button>
      </template>

      <!-- CENÁRIO C: MODO MATRIZ DE COMPETÊNCIAS (APENAS NOTAS) -->
      <div v-else class="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-zinc-950 flex justify-center transition-colors duration-200">
        <div class="w-full max-w-4xl space-y-4">
          <!-- Banner Superior da Nota -->
          <div class="p-4 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Nota Total Provisória</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-3xl sm:text-4xl font-black text-purple-700 dark:text-purple-400">{{ totalScore }}</span>
                <span class="text-sm font-bold text-slate-400">/ 1000 pontos</span>
              </div>
            </div>

            <button
              type="button"
              @click="viewLayoutMode = 'document'"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-base">photo_camera</span>
              <span>Rever Foto / Folha</span>
            </button>
          </div>

          <EssayCompetencies
            v-model="competenciesForm"
            @change="triggerAutosave"
          />
        </div>
      </div>
    </div>

    <!-- Drawer Lateral de Comentários para Mobile/Tablet -->
    <Teleport to="body">
      <Transition name="slide">
        <div v-if="showCommentsMobileDrawer" class="fixed inset-0 z-50 flex justify-end">
          <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs" @click="showCommentsMobileDrawer = false"></div>
          <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-zinc-800">
            <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900">
              <div class="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <span class="material-symbols-rounded text-xl">fact_check</span>
                <h3 class="text-sm font-black text-slate-900 dark:text-zinc-100">Anotações & Comentários</h3>
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
                @select-annotation="handleSelectAnnotation"
                @remove-annotation="handleRemoveAnnotation"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal para Criar Comentário Pedagógico -->
    <EssayCommentModal
      :show="showCommentModal"
      :selected-text="pendingCommentData?.selectedText"
      @close="showCommentModal = false"
      @save="handleSaveComment"
    />

    <!-- Modal de Confirmação de Finalização -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showFinalizeConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="showFinalizeConfirm = false"></div>

          <div class="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4 z-10 border border-slate-100 dark:border-zinc-800">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
              <span class="material-symbols-rounded text-2xl">verified</span>
            </div>

            <div class="space-y-1">
              <h3 class="text-base font-black text-slate-900 dark:text-zinc-100">Publicar Correção da Redação?</h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                A nota de <strong class="text-purple-700 dark:text-purple-400 font-black">{{ totalScore }} pontos</strong> e todas as marcações na folha ficarão imediatamente disponíveis no painel do aluno <strong class="text-slate-800 dark:text-zinc-200">{{ essay?.student?.name }}</strong>.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                @click="showFinalizeConfirm = false"
                class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                :disabled="finalizing"
                @click="finalizeCorrection"
                class="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-purple-600 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                <span v-if="finalizing" class="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                <span v-else class="material-symbols-rounded text-sm">check</span>
                <span>{{ finalizing ? 'Publicando...' : 'Confirmar & Publicar' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.25s ease-out;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>
