<script setup>
import EssayAnnotationLayer from './EssayAnnotationLayer.vue'
import { calculateEssayMetrics, calculateEnemLines } from '#shared/utils/essay-metrics'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  submissionType: {
    type: String,
    default: 'TEXT'
  },
  title: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: ''
  },
  annotations: {
    type: Array,
    default: () => []
  },
  activeTool: {
    type: String,
    default: 'select'
  },
  activeColor: {
    type: String,
    default: '#dc2626'
  },
  activeStrokeWidth: {
    type: Number,
    default: 3
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  showAnnotations: {
    type: Boolean,
    default: true
  },
  selectedAnnotationId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'add-annotation',
  'remove-annotation',
  'select-annotation',
  'open-comment-modal'
])

const textContainer = ref(null)
const ruledContentEl = ref(null)
const measuredVisualLines = ref(null)
const metrics = computed(() => calculateEssayMetrics(props.content, props.title))

const isPhotoSubmission = computed(() => {
  return props.submissionType === 'IMAGE' || (Boolean(props.imageUrl) && !props.content?.trim())
})

const photoRotation = ref(0)
const photoFilterMode = ref('SHARP') // 'SHARP', 'HIGH_CONTRAST', 'ORIGINAL'
const photoWidthMode = ref('FULL') // 'FULL' (100%), 'WIDE' (125%), 'ZOOM' (150%)

function rotateImage() {
  photoRotation.value = (photoRotation.value + 90) % 360
}

function cycleFilterMode() {
  if (photoFilterMode.value === 'SHARP') {
    photoFilterMode.value = 'HIGH_CONTRAST'
  } else if (photoFilterMode.value === 'HIGH_CONTRAST') {
    photoFilterMode.value = 'ORIGINAL'
  } else {
    photoFilterMode.value = 'SHARP'
  }
}

function cycleWidthMode() {
  if (photoWidthMode.value === 'FULL') {
    photoWidthMode.value = 'WIDE'
  } else if (photoWidthMode.value === 'WIDE') {
    photoWidthMode.value = 'ZOOM'
  } else {
    photoWidthMode.value = 'FULL'
  }
}

const photoFilterStyle = computed(() => {
  if (photoFilterMode.value === 'SHARP') {
    return 'contrast(1.22) brightness(1.02) saturate(0.92)'
  }
  if (photoFilterMode.value === 'HIGH_CONTRAST') {
    return 'contrast(1.55) brightness(0.96) grayscale(0.7)'
  }
  return 'none'
})

const photoFilterLabel = computed(() => {
  if (photoFilterMode.value === 'SHARP') return 'Nitidez Máxima (Ativa)'
  if (photoFilterMode.value === 'HIGH_CONTRAST') return 'Alto Contraste P&B'
  return 'Original'
})

const photoWidthClass = computed(() => {
  if (photoWidthMode.value === 'WIDE') return 'max-w-[1100px]'
  if (photoWidthMode.value === 'ZOOM') return 'max-w-[1300px]'
  return 'max-w-full'
})

function measureLines() {
  if (ruledContentEl.value && props.content?.trim()) {
    const isNarrow = typeof window !== 'undefined' && (window.innerWidth < 768 || ruledContentEl.value.clientWidth < 640)
    if (isNarrow) {
      measuredVisualLines.value = calculateEnemLines(props.content, 110)
      return
    }
    const h = ruledContentEl.value.clientHeight || ruledContentEl.value.offsetHeight
    if (h > 0) {
      measuredVisualLines.value = Math.max(1, Math.round(h / 36))
    }
  } else {
    measuredVisualLines.value = 0
  }
}

watch(() => props.content, () => {
  nextTick(measureLines)
})

onMounted(() => {
  nextTick(measureLines)
  window.addEventListener('resize', measureLines)
})

onUnmounted(() => {
  window.removeEventListener('resize', measureLines)
})

const effectiveLines = computed(() => {
  if (measuredVisualLines.value !== null && props.content?.trim()) {
    return measuredVisualLines.value
  }
  return metrics.value.lines
})

const linesStatusBadge = computed(() => {
  const l = effectiveLines.value
  if (l === 0) return 'Folha em branco'
  if (l < 8) return 'Menos de 8 linhas (Nota Zero no ENEM)'
  if (l <= 30) return 'Extensão oficial ideal (8 a 30)'
  return `Ultrapassou limite em ${l - 30} linha(s)!`
})

const selectionPopover = ref({
  show: false,
  x: 0,
  y: 0,
  startOffset: 0,
  endOffset: 0,
  text: ''
})

// Quebrar o texto em linhas e calcular offsets reais de caracteres
const lines = computed(() => {
  if (!props.content) return []
  const rawLines = props.content.split('\n')
  let currentOffset = 0

  return rawLines.map((lineText, idx) => {
    const start = currentOffset
    const end = start + lineText.length
    currentOffset = end + 1 // +1 pelo \n
    return {
      index: idx + 1,
      text: lineText,
      startOffset: start,
      endOffset: end
    }
  })
})

// Monitorar seleção de texto para ferramentas de sublinhar/riscar/destacar/comentar
function handleMouseUp() {
  if (props.readOnly) return

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !textContainer.value) {
    if (props.activeTool === 'select') {
      selectionPopover.value.show = false
    }
    return
  }

  const selectedText = selection.toString().trim()
  if (!selectedText) {
    selectionPopover.value.show = false
    return
  }

  // Verificar se a seleção está contida no documento
  const range = selection.getRangeAt(0)
  if (!textContainer.value.contains(range.commonAncestorContainer)) {
    return
  }

  const rect = range.getBoundingClientRect()
  const containerRect = textContainer.value.getBoundingClientRect()

  // Calcular offsets no conteúdo original
  const fullText = props.content || ''
  const indexInFull = fullText.indexOf(selectedText)
  const startOffset = indexInFull >= 0 ? indexInFull : 0
  const endOffset = startOffset + selectedText.length

  // Se a ferramenta for 'correct' (Riscar e escrever em cima)
  if (props.activeTool === 'correct') {
    emit('open-comment-modal', {
      selectedText,
      startOffset,
      endOffset,
      isCorrectionMode: true
    })
    selection.removeAllRanges()
    return
  }

  // Se uma ferramenta textual já estiver ativa, criar anotação imediatamente
  if (props.activeTool === 'underline' || props.activeTool === 'strike' || props.activeTool === 'highlighter') {
    let type = 'UNDERLINE'
    if (props.activeTool === 'strike') type = 'STRIKE'
    if (props.activeTool === 'highlighter') type = 'HIGHLIGHT'

    applyTextAnnotation(type, selectedText, startOffset, endOffset)
    selection.removeAllRanges()
    return
  }

  if (props.activeTool === 'comment') {
    emit('open-comment-modal', {
      selectedText,
      startOffset,
      endOffset,
      isCorrectionMode: false
    })
    selection.removeAllRanges()
    return
  }

  // Se a ferramenta for 'select', abrir popover flutuante
  selectionPopover.value = {
    show: true,
    x: rect.left + rect.width / 2 - containerRect.left,
    y: rect.top - containerRect.top - 46,
    startOffset,
    endOffset,
    text: selectedText
  }
}

function applyTextAnnotation(type, selectedText, startOffset, endOffset, extra = {}) {
  const newAnnotation = {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type,
    color: props.activeColor,
    selectedText,
    startOffset,
    endOffset,
    ...extra
  }
  emit('add-annotation', newAnnotation)
  selectionPopover.value.show = false
}

function handlePopoverAction(toolType) {
  const { text, startOffset, endOffset } = selectionPopover.value
  if (!text) return

  if (toolType === 'CORRECT') {
    emit('open-comment-modal', {
      selectedText: text,
      startOffset,
      endOffset,
      isCorrectionMode: true
    })
  } else if (toolType === 'COMMENT') {
    emit('open-comment-modal', {
      selectedText: text,
      startOffset,
      endOffset,
      isCorrectionMode: false
    })
  } else {
    applyTextAnnotation(toolType, text, startOffset, endOffset)
  }

  const selection = window.getSelection()
  if (selection) selection.removeAllRanges()
  selectionPopover.value.show = false
}

// Renderizar todo o texto com as marcações ativas distribuídas nas linhas pautadas
function renderFullContentHtml() {
  if (!props.content) {
    return '<span class="italic text-slate-400 select-none">Redação em branco ou não digitada.</span>'
  }

  if (!props.showAnnotations || !props.annotations || props.annotations.length === 0) {
    return escapeHtml(props.content)
  }

  const textAnnotations = props.annotations.filter(
    (a) =>
      ['UNDERLINE', 'STRIKE', 'HIGHLIGHT', 'COMMENT'].includes(a.type) &&
      a.startOffset !== null &&
      a.endOffset !== null
  )

  if (textAnnotations.length === 0) {
    return escapeHtml(props.content)
  }

  let result = ''
  const fullText = props.content

  for (let i = 0; i < fullText.length; i++) {
    const globalOffset = i
    const char = fullText[i]

    if (char === '\n') {
      result += '\n'
      continue
    }

    const matchedAnns = textAnnotations.filter(
      (a) => globalOffset >= a.startOffset && globalOffset < a.endOffset
    )

    if (matchedAnns.length === 0) {
      result += escapeHtml(char)
    } else {
      let classNames = []
      let styles = []
      let annIds = matchedAnns.map((a) => a.id).join(' ')
      let badgeHtml = ''

      matchedAnns.forEach((ann) => {
        if (ann.type === 'UNDERLINE') {
          classNames.push('underline decoration-2')
          styles.push(`text-decoration-color: ${ann.color || '#dc2626'}; text-underline-offset: 3px;`)
        } else if (ann.type === 'STRIKE') {
          classNames.push('line-through decoration-2 text-red-600')
          styles.push(`text-decoration-color: ${ann.color || '#dc2626'};`)

          // Se for o último caractere do trecho riscado e houver substituição escrita pelo professor
          if (globalOffset === ann.endOffset - 1 && ann.content) {
            badgeHtml = `<span class="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-purple-600 text-white font-sans text-xs font-black shadow-xs align-middle select-none animate-in fade-in zoom-in-90" title="Sugestão do professor"><span class="text-[10px] text-purple-200">✍️</span><span>${escapeHtml(ann.content)}</span></span>`
          }
        } else if (ann.type === 'HIGHLIGHT') {
          classNames.push('rounded-xs px-0.5')
          styles.push(`background-color: ${ann.color ? ann.color + '40' : '#fef08a80'};`)
        } else if (ann.type === 'COMMENT') {
          classNames.push('border-b-2 border-dashed')
          styles.push(`border-bottom-color: ${ann.color || '#7c3aed'}; background-color: ${ann.color ? ann.color + '15' : '#7c3aed15'};`)
        }
      })

      result += `<span class="${classNames.join(' ')} cursor-pointer transition-colors" style="${styles.join(' ')}" data-ann-ids="${annIds}">${escapeHtml(char)}</span>${badgeHtml}`
    }
  }

  return result
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function handleTextClick(e) {
  const target = e.target.closest('[data-ann-ids]')
  if (!target) return

  const ids = target.getAttribute('data-ann-ids').split(' ')
  const annId = ids[0]
  const ann = props.annotations.find((a) => a.id === annId)
  if (ann) {
    if (props.activeTool === 'eraser') {
      emit('remove-annotation', ann.id)
    } else {
      emit('select-annotation', ann)
    }
  }
}
</script>

<template>
  <div class="relative w-full overflow-x-auto flex justify-start sm:justify-center py-2 sm:py-6 px-1 sm:px-4">
    <!-- Papel Pautado Oficial ENEM -->
    <div
      ref="textContainer"
      class="relative w-full transition-all select-text overflow-hidden rounded-2xl shadow-xl dark:shadow-2xl border border-slate-300/80 dark:border-zinc-800 p-3 sm:p-6 font-sans text-slate-800 dark:text-zinc-100 bg-[#fcfbfa] dark:bg-[#18181b]"
      :class="isPhotoSubmission ? 'min-w-[720px] max-w-[1100px]' : 'min-w-[700px] max-w-[850px] min-h-[960px]'"
      @mouseup="handleMouseUp"
      @click="handleTextClick"
    >
      <!-- Cabeçalho da Folha de Redação -->
      <div class="border-b-2 border-slate-300 dark:border-zinc-800 pb-3 mb-4 select-none font-sans">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-purple-800 dark:text-purple-400 font-black text-xs uppercase tracking-wider">
            <span class="material-symbols-rounded text-lg">school</span>
            <span>Folha Oficial de Redação ENEM</span>
          </div>
          <span class="text-[11px] font-bold text-slate-500 dark:text-zinc-400">30 Linhas Máximo</span>
        </div>
        <div v-if="theme" class="mt-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
          <strong class="text-purple-900 dark:text-purple-300">Tema:</strong> {{ theme }}
        </div>
      </div>

      <!-- Barra de Métricas Oficiais da Redação (No mobile: apenas Palavras e Parágrafos; no Desktop: todas) -->
      <div v-if="!isPhotoSubmission" class="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans select-none">
        <!-- Linhas (Oculto no mobile, visível no desktop) -->
        <div class="hidden sm:block rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <span class="block text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">Linhas ENEM</span>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span
              class="text-base font-black"
              :class="effectiveLines > 30 ? 'text-rose-600 dark:text-rose-400' : effectiveLines >= 8 ? 'text-emerald-600 dark:text-emerald-400' : effectiveLines > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'"
            >
              {{ effectiveLines }}
            </span>
            <span class="text-[11px] font-bold text-slate-400">/ 30</span>
          </div>
          <span class="block truncate text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5" :title="linesStatusBadge">
            {{ linesStatusBadge }}
          </span>
        </div>

        <!-- Palavras (Visível no mobile e desktop) -->
        <div class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <span class="block text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">Palavras</span>
          <div class="mt-0.5">
            <span class="text-base font-black text-purple-700 dark:text-purple-400">{{ metrics.words }}</span>
          </div>
          <span class="block truncate text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
            {{ metrics.words >= 250 && metrics.words <= 350 ? 'Ideal (250 a 350)' : 'Total de vocábulos' }}
          </span>
        </div>

        <!-- Parágrafos (Visível no mobile e desktop) -->
        <div class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <span class="block text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">Parágrafos</span>
          <div class="mt-0.5">
            <span class="text-base font-black text-indigo-700 dark:text-indigo-400">{{ metrics.paragraphs }}</span>
          </div>
          <span class="block truncate text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5" :title="metrics.paragraphStatus.badge">
            {{ metrics.paragraphs === 4 ? '4 (Padrão ENEM)' : metrics.paragraphStatus.badge }}
          </span>
        </div>

        <!-- Frases / Períodos (Oculto no mobile, visível no desktop) -->
        <div class="hidden sm:block rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <span class="block text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500">Períodos / Frases</span>
          <div class="mt-0.5">
            <span class="text-base font-black text-slate-700 dark:text-zinc-200">{{ metrics.sentences }}</span>
          </div>
          <span class="block truncate text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
            Estrutura sintática
          </span>
        </div>
      </div>
      <div v-else class="mb-4 flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs select-none">
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-purple-700 dark:text-purple-300 text-lg">photo_camera</span>
          <span class="font-bold text-purple-900 dark:text-purple-200">Redação Manuscrita (Folha Fotografada)</span>
        </div>
        <span class="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hidden sm:inline">Avalie os critérios na aba lateral de 5 Competências</span>
      </div>

      <!-- Alertas de Linhas do ENEM se houver (somente texto no desktop) -->
      <template v-if="!isPhotoSubmission">
        <div v-if="effectiveLines > 30" class="hidden sm:flex mb-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 items-center gap-2 select-none">
          <span class="material-symbols-rounded text-base shrink-0">error</span>
          <span>Atenção: A redação possui <strong>{{ effectiveLines }} linhas</strong> (ultrapassa o limite oficial de 30 linhas do ENEM).</span>
        </div>
        <div v-else-if="effectiveLines > 0 && effectiveLines < 8" class="hidden sm:flex mb-4 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 items-center gap-2 select-none">
          <span class="material-symbols-rounded text-base shrink-0">warning</span>
          <span>Critério ENEM: Textos com menos de 8 linhas recebem <strong>Nota Zero</strong> por extensão insuficiente.</span>
        </div>
      </template>

      <!-- Título da Redação (se houver) -->
      <div v-if="title" class="text-center font-bold text-base mb-5 text-slate-900 dark:text-zinc-100 underline decoration-purple-300 dark:decoration-purple-600 select-text">
        {{ title }}
      </div>

      <!-- MODO 1: FOTO / FOLHA MANUSCRITA -->
      <div v-if="isPhotoSubmission" class="space-y-4">
        <!-- Barra de Ações Rápidas da Foto -->
        <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-xs">
          <div class="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
            <span class="material-symbols-rounded text-purple-600 text-base">image</span>
            <span class="hidden sm:inline">Folha Manuscrita Original</span>
            <span class="sm:hidden">Foto</span>
            <span class="rounded-md bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase">
              Alta Definição
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <!-- Alternador de Tamanho da Folha: 100% Padrão / 125% Amplo / 150% Zoom -->
            <button
              type="button"
              @click="cycleWidthMode"
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 font-bold transition shadow-2xs cursor-pointer border border-slate-200/60 dark:border-zinc-600"
              title="Ajustar tamanho da imagem na tela"
            >
              <span class="material-symbols-rounded text-sm">zoom_in</span>
              <span>Tamanho: <strong>{{ photoWidthMode === 'FULL' ? '100% Padrão' : photoWidthMode === 'WIDE' ? '125% Amplo' : '150% Zoom' }}</strong></span>
            </button>

            <!-- Alternador de Nitidez: Otimizada (Ativa) / Alto Contraste / Original -->
            <button
              type="button"
              @click="cycleFilterMode"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs cursor-pointer border"
              :class="photoFilterMode !== 'ORIGINAL' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-600 border-slate-200/60 dark:border-zinc-600'"
              title="Alternar filtro de nitidez e contraste para melhorar a caligrafia"
            >
              <span class="material-symbols-rounded text-sm">auto_fix_high</span>
              <span>{{ photoFilterLabel }}</span>
            </button>

            <!-- Girar 90 graus -->
            <button
              type="button"
              @click="rotateImage"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 font-bold transition shadow-2xs cursor-pointer border border-slate-200/60 dark:border-zinc-600"
              title="Girar folha 90° no sentido horário"
            >
              <span class="material-symbols-rounded text-sm">rotate_right</span>
              <span>Girar ({{ photoRotation }}°)</span>
            </button>

            <!-- Abrir imagem original em nova aba -->
            <a
              v-if="imageUrl"
              :href="imageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 font-bold transition shadow-2xs cursor-pointer border border-slate-200/60 dark:border-zinc-600"
              title="Abrir imagem em tamanho original em outra aba"
            >
              <span class="material-symbols-rounded text-sm">open_in_new</span>
              <span class="hidden sm:inline">Abrir Original</span>
            </a>
          </div>
        </div>

        <!-- Área da Foto com a Camada SVG de Desenho Livre e Anotações -->
        <div class="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-black/60 flex justify-center items-center p-1 sm:p-2">
          <div
            class="relative w-full transition-all duration-200 flex justify-center items-center"
            :class="photoWidthClass"
          >
            <div class="relative w-full rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/80">
              <img
                :src="imageUrl"
                alt="Folha de redação manuscrita enviada pelo aluno"
                class="w-full h-auto block object-contain transition-all duration-200 select-none pointer-events-none"
                :style="{
                  transform: `rotate(${photoRotation}deg)`,
                  filter: photoFilterStyle,
                  imageRendering: '-webkit-optimize-contrast',
                  minHeight: '400px'
                }"
              />

              <!-- Camada de Anotação SVG Sobre a Imagem -->
              <EssayAnnotationLayer
                :annotations="annotations"
                :active-tool="activeTool"
                :active-color="activeColor"
                :active-stroke-width="activeStrokeWidth"
                :read-only="readOnly"
                :show-annotations="showAnnotations"
                :selected-annotation-id="selectedAnnotationId"
                @add-annotation="emit('add-annotation', $event)"
                @remove-annotation="emit('remove-annotation', $event)"
                @select-annotation="emit('select-annotation', $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- MODO 2: TEXTO DIGITADO (FOLHA PAUTADA OFICIAL ENEM) -->
      <div v-else>
        <!-- Popover Flutuante de Seleção de Texto (quando activeTool === 'select') -->
        <Transition name="popover">
          <div
            v-if="selectionPopover.show && !readOnly"
            class="absolute z-40 flex items-center gap-1 bg-slate-900 dark:bg-zinc-800 text-white px-2.5 py-1.5 rounded-2xl shadow-2xl border border-slate-700 dark:border-zinc-700 -translate-x-1/2 animate-in fade-in zoom-in-95"
            :style="{ left: `${selectionPopover.x}px`, top: `${selectionPopover.y}px` }"
          >
            <!-- Botão Destaque: Riscar e Escrever em Cima -->
            <button
              type="button"
              title="Riscar e Escrever Correção em Cima"
              @click="handlePopoverAction('CORRECT')"
              class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition cursor-pointer shadow-xs"
            >
              <span class="material-symbols-rounded text-sm">spellcheck</span>
              <span>Corrigir / Escrever</span>
            </button>

            <div class="h-4 w-px bg-slate-700 dark:bg-zinc-700 mx-0.5"></div>

            <button
              type="button"
              title="Sublinhar"
              @click="handlePopoverAction('UNDERLINE')"
              class="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-700 text-amber-300 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-base">format_underlined</span>
            </button>
            <button
              type="button"
              title="Apenas Riscar / Tachar"
              @click="handlePopoverAction('STRIKE')"
              class="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-700 text-red-400 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-base">strikethrough_s</span>
            </button>
            <button
              type="button"
              title="Destacar com Marca-texto"
              @click="handlePopoverAction('HIGHLIGHT')"
              class="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-700 text-yellow-300 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-base">ink_highlighter</span>
            </button>
            <button
              type="button"
              title="Adicionar Comentário Marginal"
              @click="handlePopoverAction('COMMENT')"
              class="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-slate-800 dark:hover:bg-zinc-700 text-purple-300 transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-base">add_comment</span>
            </button>
          </div>
        </Transition>

        <!-- Linhas Numeradas e Folha Pautada Oficial ENEM -->
        <div class="relative flex text-sm sm:text-base tracking-normal select-text">
          <!-- Coluna de Números das Linhas (1 a 30+) perfeitamente alinhadas com as pautas -->
          <div class="hidden sm:flex w-10 sm:w-12 shrink-0 select-none border-r-2 border-red-500/80 dark:border-red-600/80 pr-1 sm:pr-2 flex-col font-mono text-xs">
            <div
              v-for="lineNum in Math.max(30, effectiveLines)"
              :key="lineNum"
              class="h-[36px] flex items-center justify-end font-bold transition-colors select-none"
              :class="{
                'text-purple-600 dark:text-purple-400 font-black bg-purple-100/60 dark:bg-purple-950/40 rounded-l': lineNum <= effectiveLines && lineNum <= 30,
                'text-slate-300 dark:text-zinc-700 font-normal': lineNum > effectiveLines && lineNum <= 30,
                'text-rose-600 dark:text-rose-400 font-black bg-rose-100/70 dark:bg-rose-950/40 rounded-l': lineNum > 30
              }"
              :title="lineNum <= 30 ? `Linha ${lineNum} do ENEM` : `Linha ${lineNum} (Excede o limite do ENEM)`"
            >
              {{ lineNum.toString().padStart(2, '0') }}
            </div>
          </div>

          <!-- Área de Texto com Pautas Azuis Contínuas (cada linha que dobra cai exatamente na linha pautada de baixo) -->
          <div class="relative flex-1 min-h-[1080px]">
            <!-- Camada SVG de Desenho Livre & Marcações Visuais -->
            <EssayAnnotationLayer
              :annotations="annotations"
              :active-tool="activeTool"
              :active-color="activeColor"
              :active-stroke-width="activeStrokeWidth"
              :read-only="readOnly"
              :show-annotations="showAnnotations"
              :selected-annotation-id="selectedAnnotationId"
              @add-annotation="emit('add-annotation', $event)"
              @remove-annotation="emit('remove-annotation', $event)"
              @select-annotation="emit('select-annotation', $event)"
            />

            <!-- Texto do Aluno assentado na malha pautada -->
            <div class="ruled-paper-text w-full min-h-[1080px] font-sans text-slate-800 dark:text-zinc-100 select-text outline-none">
              <div ref="ruledContentEl" class="whitespace-pre-wrap select-text" v-html="renderFullContentHtml()"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ruled-paper-text {
  line-height: 36px !important;
  font-size: 15px;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0.01em;
  padding: 0 14px !important;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 35px,
    rgba(147, 197, 253, 0.45) 35px,
    rgba(147, 197, 253, 0.45) 36px
  );
  background-size: 100% 36px;
  background-position: 0 0;
  box-sizing: border-box;
  text-align: justify !important;
  text-justify: inter-word !important;
}

.popover-enter-active, .popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.popover-enter-from, .popover-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>
