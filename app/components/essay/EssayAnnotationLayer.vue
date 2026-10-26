<script setup>
const props = defineProps({
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
    default: 3.5
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

const containerRef = ref(null)
const svgRef = ref(null)

const isDrawing = ref(false)
const isErasing = ref(false)
const currentStroke = ref([])
const startPoint = ref(null)
const pointerDownTimestamp = ref(0)
const pointerDownPos = ref(null)

// Popovers interativos na folha
const pendingStrike = ref(null) // { points: [p1, p2], color, strokeWidth }
const strikeCorrectionText = ref('')
const strikeInputRef = ref(null)

const pendingNote = ref(null) // { x, y, color }
const noteText = ref('')
const noteCategory = ref('GRAMMAR')
const noteInputRef = ref(null)

// Sugestões rápidas para a ferramenta Riscar & Escrever
const quickChips = [
  'Crase',
  'Concordância',
  'Pontuação',
  'Ortografia',
  'Regência',
  'Repetição',
  'Paragradação',
  'Coesão'
]

const categories = [
  { id: 'GRAMMAR', label: 'Gramática (C1)' },
  { id: 'REPERTOIRE', label: 'Tema / Repertório (C2)' },
  { id: 'ARGUMENTATION', label: 'Argumentação (C3)' },
  { id: 'COHESION', label: 'Coesão / Conectivo (C4)' },
  { id: 'PROPOSAL', label: 'Proposta (C5)' },
  { id: 'OTHER', label: 'Geral / Outro' }
]

const categoryLabels = {
  GRAMMAR: 'Gramática',
  ARGUMENTATION: 'Argumentação',
  COHESION: 'Coesão',
  REPERTOIRE: 'Repertório',
  STRUCTURE: 'Estrutura',
  PROPOSAL: 'Proposta C5',
  VOCABULARY: 'Vocabulário',
  OTHER: 'Observação'
}

function getCategoryLabel(cat) {
  return (cat && categoryLabels[cat]) ? categoryLabels[cat] : 'Observação'
}

// Converter coordenadas da tela para coordenadas relativas da SVG (0 a 1)
// Usa getScreenCTM().inverse() para precisão matemática absoluta mesmo com zoom e rotação CSS
function getCoordinates(e) {
  if (svgRef.value && typeof svgRef.value.createSVGPoint === 'function') {
    try {
      const svg = svgRef.value
      const pt = svg.createSVGPoint()
      pt.x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
      pt.y = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0
      const ctm = svg.getScreenCTM()
      if (ctm) {
        const local = pt.matrixTransform(ctm.inverse())
        return {
          x: Math.max(0, Math.min(1, local.x / 1000)),
          y: Math.max(0, Math.min(1, local.y / 1000))
        }
      }
    } catch {}
  }

  // Fallback baseado no container DOM
  const el = containerRef.value || svgRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
  const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0

  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1))),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)))
  }
}

// Início do toque / clique do ponteiro
function handlePointerDown(e) {
  if (props.readOnly) return

  // Fechar popover anterior se clicar fora dele
  if (pendingStrike.value && !e.target.closest('.strike-popover')) {
    cancelPendingStrike()
  }
  if (pendingNote.value && !e.target.closest('.note-popover')) {
    cancelPendingNote()
  }

  const pt = getCoordinates(e)
  pointerDownTimestamp.value = Date.now()
  pointerDownPos.value = pt

  // Capturar ponteiro para desenho contínuo
  if (e.target && e.target.setPointerCapture && e.pointerId) {
    try {
      e.target.setPointerCapture(e.pointerId)
    } catch {}
  }

  // Ferramenta Borracha
  if (props.activeTool === 'eraser') {
    isErasing.value = true
    checkAndEraseAt(pt)
    return
  }

  // Ferramentas de desenho e risco
  const drawingTools = ['correct', 'strike', 'underline', 'pen', 'highlighter', 'circle', 'arrow']
  if (drawingTools.includes(props.activeTool)) {
    e.preventDefault()
    isDrawing.value = true
    startPoint.value = pt
    currentStroke.value = [pt]
  }
}

// Movimento do ponteiro
function handlePointerMove(e) {
  if (props.readOnly) return
  const pt = getCoordinates(e)

  if (props.activeTool === 'eraser' && isErasing.value) {
    checkAndEraseAt(pt)
    return
  }

  if (!isDrawing.value) return
  e.preventDefault()

  if (props.activeTool === 'pen' || props.activeTool === 'highlighter') {
    currentStroke.value.push(pt)
  } else if (['correct', 'strike', 'underline', 'circle', 'arrow'].includes(props.activeTool)) {
    currentStroke.value = [startPoint.value, pt]
  }
}

// Finalização do toque / clique do ponteiro
function handlePointerUp(e) {
  if (props.readOnly) return

  if (e.target && e.target.releasePointerCapture && e.pointerId) {
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch {}
  }

  if (props.activeTool === 'eraser') {
    isErasing.value = false
    return
  }

  const pt = getCoordinates(e)
  const isClick = pointerDownPos.value && Math.hypot(pt.x - pointerDownPos.value.x, pt.y - pointerDownPos.value.y) < 0.015

  // Se a ferramenta for 'text' (Escrever Nota na Folha) e for um clique limpo
  if (props.activeTool === 'text' && isClick) {
    openNotePopover(pt)
    isDrawing.value = false
    currentStroke.value = []
    startPoint.value = null
    return
  }

  // Se a ferramenta for 'comment' e for um clique
  if (props.activeTool === 'comment' && isClick) {
    openNotePopover(pt)
    isDrawing.value = false
    currentStroke.value = []
    startPoint.value = null
    return
  }

  if (!isDrawing.value) return
  isDrawing.value = false

  // Se for ferramenta de risco e escrita ('correct')
  if (props.activeTool === 'correct' && currentStroke.value.length >= 2) {
    const p1 = currentStroke.value[0]
    const p2 = currentStroke.value[currentStroke.value.length - 1]
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

    if (dist > 0.01) {
      openStrikePopover(p1, p2)
    }
    currentStroke.value = []
    startPoint.value = null
    return
  }

  // Se for ferramenta de risco reto simples ('strike')
  if (props.activeTool === 'strike' && currentStroke.value.length >= 2) {
    const p1 = currentStroke.value[0]
    const p2 = currentStroke.value[currentStroke.value.length - 1]
    if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.01) {
      emit('add-annotation', {
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'STRIKE',
        color: props.activeColor,
        strokeWidth: props.activeStrokeWidth || 3.5,
        points: [p1, p2],
        content: null,
        x: (p1.x + p2.x) / 2,
        y: Math.min(p1.y, p2.y)
      })
    }
    currentStroke.value = []
    startPoint.value = null
    return
  }

  // Se for ferramenta de sublinhar reto ('underline')
  if (props.activeTool === 'underline' && currentStroke.value.length >= 2) {
    const p1 = currentStroke.value[0]
    const p2 = currentStroke.value[currentStroke.value.length - 1]
    if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.01) {
      emit('add-annotation', {
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'UNDERLINE',
        color: props.activeColor,
        strokeWidth: props.activeStrokeWidth || 3,
        points: [p1, p2],
        content: null,
        x: (p1.x + p2.x) / 2,
        y: Math.max(p1.y, p2.y)
      })
    }
    currentStroke.value = []
    startPoint.value = null
    return
  }

  // Traçado Livre (Caneta, Marca-texto, Círculo, Seta)
  if (currentStroke.value.length >= 2) {
    let type = 'DRAW'
    let strokeWidth = props.activeStrokeWidth || 3.5

    if (props.activeTool === 'highlighter') {
      type = 'HIGHLIGHT'
      strokeWidth = 16
    } else if (props.activeTool === 'circle') {
      type = 'CIRCLE'
    } else if (props.activeTool === 'arrow') {
      type = 'ARROW'
    }

    emit('add-annotation', {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type,
      color: props.activeColor,
      strokeWidth,
      points: currentStroke.value
    })
  }

  currentStroke.value = []
  startPoint.value = null
}

// ---------------------------------------------------------------------
// FLUXO DE RISCAR & ESCREVER EM CIMA (CORRECT TOOL)
// ---------------------------------------------------------------------
function openStrikePopover(p1, p2) {
  pendingStrike.value = {
    points: [p1, p2],
    color: props.activeColor,
    strokeWidth: props.activeStrokeWidth || 3.5
  }
  strikeCorrectionText.value = ''
  nextTick(() => {
    if (strikeInputRef.value) {
      strikeInputRef.value.focus()
    }
  })
}

function appendStrikeChip(chip) {
  if (strikeCorrectionText.value) {
    strikeCorrectionText.value += ` (${chip})`
  } else {
    strikeCorrectionText.value = chip
  }
  if (strikeInputRef.value) strikeInputRef.value.focus()
}

function confirmPendingStrike() {
  if (!pendingStrike.value) return
  const p1 = pendingStrike.value.points[0]
  const p2 = pendingStrike.value.points[1]
  const text = strikeCorrectionText.value.trim()

  emit('add-annotation', {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: 'STRIKE',
    color: pendingStrike.value.color,
    strokeWidth: pendingStrike.value.strokeWidth,
    points: [p1, p2],
    content: text || null,
    category: 'GRAMMAR',
    x: (p1.x + p2.x) / 2,
    y: Math.min(p1.y, p2.y)
  })

  cancelPendingStrike()
}

function savePendingStrikeOnly() {
  if (!pendingStrike.value) return
  const p1 = pendingStrike.value.points[0]
  const p2 = pendingStrike.value.points[1]

  emit('add-annotation', {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: 'STRIKE',
    color: pendingStrike.value.color,
    strokeWidth: pendingStrike.value.strokeWidth,
    points: [p1, p2],
    content: null,
    x: (p1.x + p2.x) / 2,
    y: Math.min(p1.y, p2.y)
  })

  cancelPendingStrike()
}

function cancelPendingStrike() {
  pendingStrike.value = null
  strikeCorrectionText.value = ''
}

// ---------------------------------------------------------------------
// FLUXO DE ESCREVER NOTA NA FOLHA (TEXT / NOTE TOOL)
// ---------------------------------------------------------------------
function openNotePopover(pt) {
  pendingNote.value = {
    x: pt.x,
    y: pt.y,
    color: props.activeColor
  }
  noteText.value = ''
  noteCategory.value = 'GRAMMAR'
  nextTick(() => {
    if (noteInputRef.value) {
      noteInputRef.value.focus()
    }
  })
}

function confirmPendingNote() {
  if (!pendingNote.value || !noteText.value.trim()) return

  emit('add-annotation', {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: 'COMMENT',
    color: pendingNote.value.color,
    content: noteText.value.trim(),
    category: noteCategory.value,
    x: pendingNote.value.x,
    y: pendingNote.value.y
  })

  cancelPendingNote()
}

function cancelPendingNote() {
  pendingNote.value = null
  noteText.value = ''
}

// ---------------------------------------------------------------------
// BORRACHA INTELIGENTE: APAGA QUALQUER RISCO, NOTA OU TRAÇO POR PROXIMIDADE
// ---------------------------------------------------------------------
function checkAndEraseAt(pt) {
  const threshold = 0.035

  for (const ann of props.annotations) {
    // 1. Apagar Anotações de Texto / Comentários no ponto
    if (ann.type === 'COMMENT' && ann.x !== undefined && ann.y !== undefined) {
      if (Math.hypot(ann.x - pt.x, ann.y - pt.y) < threshold * 1.5) {
        emit('remove-annotation', ann.id)
        break
      }
    }

    // 2. Apagar Linhas Retas (STRIKE ou UNDERLINE)
    if (['STRIKE', 'UNDERLINE'].includes(ann.type)) {
      const coords = getLineCoords(ann.points)
      if (coords) {
        const p1 = { x: coords.x1 / 1000, y: coords.y1 / 1000 }
        const p2 = { x: coords.x2 / 1000, y: coords.y2 / 1000 }
        if (distanceToSegment(pt, p1, p2) < threshold) {
          emit('remove-annotation', ann.id)
          break
        }
      }
    }

    // 3. Apagar Traçados Livres (DRAW, HIGHLIGHT, etc.)
    const pts = parsePoints(ann.points)
    if (pts.length > 0) {
      const hit = pts.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold)
      if (hit) {
        emit('remove-annotation', ann.id)
        break
      }
    }
  }
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.hypot(p.x - projX, p.y - projY)
}

function handleAnnotationClick(ann, e) {
  e.stopPropagation()
  if (props.activeTool === 'eraser') {
    emit('remove-annotation', ann.id)
  } else {
    emit('select-annotation', ann)
  }
}

// ---------------------------------------------------------------------
// HELPERS SVG E GEOMETRIA
// ---------------------------------------------------------------------
function parsePoints(points) {
  if (!points) return []
  if (Array.isArray(points)) return points
  if (typeof points === 'string') {
    try {
      const parsed = JSON.parse(points)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function pointsToSvgPath(points) {
  const pts = parsePoints(points)
  if (pts.length === 0) return ''

  let d = `M ${pts[0].x * 1000} ${pts[0].y * 1000}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x * 1000} ${pts[i].y * 1000}`
  }
  return d
}

function getLineCoords(points) {
  const pts = parsePoints(points)
  if (pts.length < 2) return null
  return {
    x1: pts[0].x * 1000,
    y1: pts[0].y * 1000,
    x2: pts[pts.length - 1].x * 1000,
    y2: pts[pts.length - 1].y * 1000
  }
}

function pointsToCircle(points) {
  const pts = parsePoints(points)
  if (pts.length < 2) return null
  const p1 = pts[0]
  const p2 = pts[pts.length - 1]

  const x1 = p1.x * 1000
  const y1 = p1.y * 1000
  const x2 = p2.x * 1000
  const y2 = p2.y * 1000

  return {
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    rx: Math.abs(x2 - x1) / 2,
    ry: Math.abs(y2 - y1) / 2
  }
}

function pointsToArrow(points) {
  const pts = parsePoints(points)
  if (pts.length < 2) return null
  const p1 = pts[0]
  const p2 = pts[pts.length - 1]

  const x1 = p1.x * 1000
  const y1 = p1.y * 1000
  const x2 = p2.x * 1000
  const y2 = p2.y * 1000

  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 16
  const arrowX1 = x2 - headLen * Math.cos(angle - Math.PI / 6)
  const arrowY1 = y2 - headLen * Math.sin(angle - Math.PI / 6)
  const arrowX2 = x2 - headLen * Math.cos(angle + Math.PI / 6)
  const arrowY2 = y2 - headLen * Math.sin(angle + Math.PI / 6)

  return {
    linePath: `M ${x1} ${y1} L ${x2} ${y2}`,
    headPath: `M ${arrowX1} ${arrowY1} L ${x2} ${y2} L ${arrowX2} ${arrowY2}`
  }
}

function getAnnotationBadgePos(ann) {
  if (ann.x !== undefined && ann.x !== null && ann.y !== undefined && ann.y !== null) {
    return { x: ann.x, y: ann.y }
  }
  const pts = parsePoints(ann.points)
  if (pts.length >= 2) {
    return {
      x: (pts[0].x + pts[pts.length - 1].x) / 2,
      y: Math.min(pts[0].y, pts[pts.length - 1].y)
    }
  }
  if (pts.length === 1) {
    return { x: pts[0].x, y: pts[0].y }
  }
  return { x: 0.5, y: 0.5 }
}

function getBadgeBgColorClass(color) {
  if (!color) return 'bg-purple-700 border-purple-400'
  const c = color.toLowerCase()
  if (c.includes('dc2626') || c.includes('ef4444') || c.includes('red')) {
    return 'bg-red-600 border-red-400'
  }
  if (c.includes('16a34a') || c.includes('10b981') || c.includes('emerald') || c.includes('green')) {
    return 'bg-emerald-600 border-emerald-400'
  }
  if (c.includes('f59e0b') || c.includes('eab308') || c.includes('amber') || c.includes('yellow')) {
    return 'bg-amber-600 border-amber-400'
  }
  if (c.includes('2563eb') || c.includes('3b82f6') || c.includes('blue')) {
    return 'bg-blue-600 border-blue-400'
  }
  return 'bg-purple-700 border-purple-400'
}
</script>

<template>
  <div
    ref="containerRef"
    class="absolute inset-0 z-10 select-none overflow-visible touch-none"
    :class="[
      readOnly ? 'pointer-events-none' : '',
      activeTool === 'eraser' ? 'cursor-not-allowed pointer-events-auto' : '',
      ['correct', 'strike', 'underline', 'pen', 'highlighter', 'circle', 'arrow'].includes(activeTool) ? 'cursor-crosshair pointer-events-auto' : '',
      activeTool === 'text' || activeTool === 'comment' ? 'cursor-text pointer-events-auto' : '',
      activeTool === 'select' ? 'cursor-default pointer-events-auto' : ''
    ]"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerUp"
  >
    <!-- Camada SVG de Desenhos, Linhas e Marcações -->
    <svg
      v-if="showAnnotations"
      ref="svgRef"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      class="w-full h-full overflow-visible"
    >
      <g v-for="ann in annotations" :key="ann.id" class="annotation-item">
        <!-- 1. RISCO RETO / TACHAR (STRIKE) -->
        <g v-if="ann.type === 'STRIKE' && getLineCoords(ann.points)">
          <!-- Hitbox ampla para clique ou apagamento -->
          <line
            :x1="getLineCoords(ann.points).x1"
            :y1="getLineCoords(ann.points).y1"
            :x2="getLineCoords(ann.points).x2"
            :y2="getLineCoords(ann.points).y2"
            stroke="transparent"
            stroke-width="26"
            stroke-linecap="round"
            class="pointer-events-auto cursor-pointer"
            @click="handleAnnotationClick(ann, $event)"
          />
          <!-- Traço visual riscado -->
          <line
            :x1="getLineCoords(ann.points).x1"
            :y1="getLineCoords(ann.points).y1"
            :x2="getLineCoords(ann.points).x2"
            :y2="getLineCoords(ann.points).y2"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3.5"
            stroke-linecap="round"
            class="transition-all duration-150 pointer-events-none"
            :class="[
              selectedAnnotationId === ann.id ? 'stroke-[5.5] opacity-100 filter drop-shadow' : 'opacity-90'
            ]"
          />
        </g>

        <!-- 2. SUBLINHADO RETO (UNDERLINE) -->
        <g v-else-if="ann.type === 'UNDERLINE' && getLineCoords(ann.points)">
          <line
            :x1="getLineCoords(ann.points).x1"
            :y1="getLineCoords(ann.points).y1"
            :x2="getLineCoords(ann.points).x2"
            :y2="getLineCoords(ann.points).y2"
            stroke="transparent"
            stroke-width="24"
            stroke-linecap="round"
            class="pointer-events-auto cursor-pointer"
            @click="handleAnnotationClick(ann, $event)"
          />
          <line
            :x1="getLineCoords(ann.points).x1"
            :y1="getLineCoords(ann.points).y1"
            :x2="getLineCoords(ann.points).x2"
            :y2="getLineCoords(ann.points).y2"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3"
            stroke-linecap="round"
            class="transition-all duration-150 pointer-events-none"
            :class="[
              selectedAnnotationId === ann.id ? 'stroke-[4.5] opacity-100 filter drop-shadow' : 'opacity-90'
            ]"
          />
        </g>

        <!-- 3. CANETA LIVRE (DRAW / PEN) -->
        <g v-else-if="ann.type === 'DRAW' && parsePoints(ann.points).length > 0">
          <path
            :d="pointsToSvgPath(ann.points)"
            stroke="transparent"
            stroke-width="24"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            class="pointer-events-auto cursor-pointer"
            @click="handleAnnotationClick(ann, $event)"
          />
          <path
            :d="pointsToSvgPath(ann.points)"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            class="transition-all duration-150 pointer-events-none"
            :class="[
              selectedAnnotationId === ann.id ? 'opacity-100 stroke-[5] filter drop-shadow' : 'opacity-90'
            ]"
          />
        </g>

        <!-- 4. MARCA-TEXTO TRANSLÚCIDO (HIGHLIGHT) -->
        <path
          v-else-if="ann.type === 'HIGHLIGHT' && parsePoints(ann.points).length > 0"
          :d="pointsToSvgPath(ann.points)"
          :stroke="ann.color || '#fef08a'"
          :stroke-width="ann.strokeWidth || 16"
          stroke-linecap="square"
          stroke-linejoin="round"
          stroke-opacity="0.45"
          fill="none"
          class="pointer-events-auto cursor-pointer transition-opacity hover:stroke-opacity-75"
          @click="handleAnnotationClick(ann, $event)"
        />

        <!-- 5. FORMA CIRCULAR (CIRCLE) -->
        <g v-else-if="ann.type === 'CIRCLE' && pointsToCircle(ann.points)">
          <ellipse
            :cx="pointsToCircle(ann.points).cx"
            :cy="pointsToCircle(ann.points).cy"
            :rx="pointsToCircle(ann.points).rx"
            :ry="pointsToCircle(ann.points).ry"
            stroke="transparent"
            stroke-width="24"
            fill="none"
            class="pointer-events-auto cursor-pointer"
            @click="handleAnnotationClick(ann, $event)"
          />
          <ellipse
            :cx="pointsToCircle(ann.points).cx"
            :cy="pointsToCircle(ann.points).cy"
            :rx="pointsToCircle(ann.points).rx"
            :ry="pointsToCircle(ann.points).ry"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3.5"
            stroke-dasharray="4,4"
            fill="none"
            class="pointer-events-none transition-opacity"
          />
        </g>

        <!-- 6. SETA APONTADORA (ARROW) -->
        <g
          v-else-if="ann.type === 'ARROW' && pointsToArrow(ann.points)"
          class="pointer-events-auto cursor-pointer"
          @click="handleAnnotationClick(ann, $event)"
        >
          <path
            :d="pointsToArrow(ann.points).linePath"
            stroke="transparent"
            stroke-width="24"
            stroke-linecap="round"
            fill="none"
          />
          <path
            :d="pointsToArrow(ann.points).linePath"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3.5"
            stroke-linecap="round"
            fill="none"
          />
          <path
            :d="pointsToArrow(ann.points).headPath"
            :stroke="ann.color || '#dc2626'"
            :stroke-width="ann.strokeWidth || 3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </g>
      </g>

      <!-- PREVIEW EM TEMPO REAL ENQUANTO DESENHA -->
      <g v-if="isDrawing && currentStroke.length > 1">
        <!-- Preview de Riscar / Tachar Reto -->
        <line
          v-if="['correct', 'strike'].includes(activeTool)"
          :x1="currentStroke[0].x * 1000"
          :y1="currentStroke[0].y * 1000"
          :x2="currentStroke[currentStroke.length - 1].x * 1000"
          :y2="currentStroke[currentStroke.length - 1].y * 1000"
          :stroke="activeColor"
          :stroke-width="activeStrokeWidth || 3.5"
          stroke-linecap="round"
          class="pointer-events-none drop-shadow"
        />

        <!-- Preview de Sublinhar Reto -->
        <line
          v-else-if="activeTool === 'underline'"
          :x1="currentStroke[0].x * 1000"
          :y1="currentStroke[0].y * 1000"
          :x2="currentStroke[currentStroke.length - 1].x * 1000"
          :y2="currentStroke[currentStroke.length - 1].y * 1000"
          :stroke="activeColor"
          :stroke-width="activeStrokeWidth || 3"
          stroke-linecap="round"
          class="pointer-events-none"
        />

        <!-- Preview de Caneta Livre -->
        <path
          v-else-if="activeTool === 'pen'"
          :d="pointsToSvgPath(currentStroke)"
          :stroke="activeColor"
          :stroke-width="activeStrokeWidth || 3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
          opacity="0.95"
          class="pointer-events-none"
        />

        <!-- Preview de Marca-texto -->
        <path
          v-else-if="activeTool === 'highlighter'"
          :d="pointsToSvgPath(currentStroke)"
          :stroke="activeColor"
          :stroke-width="16"
          stroke-linecap="square"
          stroke-linejoin="round"
          stroke-opacity="0.45"
          fill="none"
          class="pointer-events-none"
        />

        <!-- Preview de Círculo -->
        <ellipse
          v-else-if="activeTool === 'circle' && pointsToCircle(currentStroke)"
          :cx="pointsToCircle(currentStroke).cx"
          :cy="pointsToCircle(currentStroke).cy"
          :rx="pointsToCircle(currentStroke).rx"
          :ry="pointsToCircle(currentStroke).ry"
          :stroke="activeColor"
          :stroke-width="activeStrokeWidth || 3.5"
          stroke-dasharray="4,4"
          fill="none"
          class="pointer-events-none"
        />

        <!-- Preview de Seta -->
        <g v-else-if="activeTool === 'arrow' && pointsToArrow(currentStroke)" class="pointer-events-none">
          <path
            :d="pointsToArrow(currentStroke).linePath"
            :stroke="activeColor"
            :stroke-width="activeStrokeWidth || 3.5"
            stroke-linecap="round"
            fill="none"
          />
          <path
            :d="pointsToArrow(currentStroke).headPath"
            :stroke="activeColor"
            :stroke-width="activeStrokeWidth || 3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </g>
      </g>
    </svg>

    <!-- CAMADA HTML: BADGES DE TEXTO ESCRITO E CAIXAS DE NOTAS POR CIMA DA FOTO -->
    <div v-if="showAnnotations" class="absolute inset-0 pointer-events-none overflow-visible">
      <template v-for="ann in annotations" :key="'badge_' + ann.id">
        <!-- 1. BADGE DE RISCAR E ESCREVER EM CIMA (STRIKE com content) -->
        <div
          v-if="ann.type === 'STRIKE' && ann.content"
          class="absolute -translate-x-1/2 -translate-y-[115%] z-20 pointer-events-auto transition-transform duration-150"
          :style="{
            left: `${getAnnotationBadgePos(ann).x * 100}%`,
            top: `${getAnnotationBadgePos(ann).y * 100}%`
          }"
        >
          <div
            class="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-white font-sans text-xs font-black shadow-lg border select-none transition-all duration-150 cursor-pointer"
            :class="[
              selectedAnnotationId === ann.id ? 'ring-2 ring-purple-400 scale-105 shadow-purple-900/30' : 'hover:scale-105',
              getBadgeBgColorClass(ann.color)
            ]"
            :title="readOnly ? 'Sugestão do professor' : 'Clique para selecionar ou use a borracha para apagar'"
            @click="handleAnnotationClick(ann, $event)"
          >
            <span class="text-[11px] text-white/90">✍️</span>
            <span class="font-bold tracking-tight">{{ ann.content }}</span>
            <button
              v-if="!readOnly"
              type="button"
              title="Remover anotação"
              @click.stop="emit('remove-annotation', ann.id)"
              class="opacity-70 hover:opacity-100 hover:bg-black/20 rounded-full h-4 w-4 flex items-center justify-center text-xs ml-0.5 transition"
            >
              ×
            </button>
          </div>
        </div>

        <!-- 2. ANOTAÇÃO LIVRE / NOTA NA FOLHA (COMMENT com content) -->
        <div
          v-else-if="ann.type === 'COMMENT' && ann.content"
          class="absolute -translate-x-1/2 -translate-y-full -mt-2 z-20 pointer-events-auto transition-transform duration-150"
          :style="{
            left: `${(ann.x ?? 0.5) * 100}%`,
            top: `${(ann.y ?? 0.5) * 100}%`
          }"
        >
          <div
            class="group/note relative flex flex-col rounded-2xl p-2.5 shadow-xl border select-none transition-all duration-150 cursor-pointer min-w-[140px] max-w-[260px] bg-slate-900/95 dark:bg-zinc-900/95 text-white border-slate-700/80 dark:border-zinc-700"
            :class="[
              selectedAnnotationId === ann.id ? 'ring-2 ring-purple-500 scale-105 shadow-purple-900/40' : 'hover:scale-102'
            ]"
            @click="handleAnnotationClick(ann, $event)"
          >
            <div class="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-800 dark:border-zinc-800">
              <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-300">
                <span class="material-symbols-rounded text-xs">edit_note</span>
                <span>{{ getCategoryLabel(ann.category) }}</span>
              </span>
              <button
                v-if="!readOnly"
                type="button"
                title="Apagar nota"
                @click.stop="emit('remove-annotation', ann.id)"
                class="opacity-60 hover:opacity-100 hover:text-red-400 text-xs px-1"
              >
                ×
              </button>
            </div>
            <p class="text-xs font-medium text-slate-100 leading-snug mt-1 break-words">
              {{ ann.content }}
            </p>
            <!-- Triângulo indicador na folha -->
            <div class="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-zinc-900 border-r border-b border-slate-700/80 dark:border-zinc-700"></div>
          </div>
        </div>
      </template>
    </div>

    <!-- POPOVER FLUTUANTE 1: RISCAR & ESCREVER CORREÇÃO EM CIMA -->
    <div
      v-if="pendingStrike && !readOnly"
      class="strike-popover absolute z-50 -translate-x-1/2 -translate-y-[120%] bg-slate-900/95 dark:bg-zinc-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 dark:border-zinc-700 w-72 sm:w-80 backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-auto"
      :style="{
        left: `${Math.max(0.18, Math.min(0.82, (pendingStrike.points[0].x + pendingStrike.points[1].x) / 2)) * 100}%`,
        top: `${Math.max(0.08, Math.min(pendingStrike.points[0].y, pendingStrike.points[1].y)) * 100}%`
      }"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-xs font-black text-purple-300">
          <span class="text-sm">✍️</span>
          <span>Escrever Correção em Cima</span>
        </div>
        <button
          type="button"
          @click="cancelPendingStrike"
          class="text-slate-400 hover:text-white text-xs h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-800 transition"
        >
          ✕
        </button>
      </div>

      <input
        ref="strikeInputRef"
        v-model="strikeCorrectionText"
        type="text"
        placeholder="Escreva a palavra correta (ex: havia, exceção)..."
        class="w-full px-3 py-2 rounded-xl bg-slate-800 dark:bg-zinc-800 border border-slate-600 dark:border-zinc-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium"
        @keydown.enter.prevent="confirmPendingStrike"
        @keydown.esc.prevent="cancelPendingStrike"
      />

      <!-- Atalhos de tags rápidas -->
      <div class="flex flex-wrap gap-1 mt-2">
        <button
          v-for="chip in quickChips"
          :key="chip"
          type="button"
          @click="appendStrikeChip(chip)"
          class="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-purple-900/60 text-[10px] font-bold text-slate-300 hover:text-purple-200 border border-slate-700 transition cursor-pointer"
        >
          {{ chip }}
        </button>
      </div>

      <div class="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-slate-800 text-[11px]">
        <button
          type="button"
          @click="savePendingStrikeOnly"
          class="px-2.5 py-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          title="Salvar apenas o traço riscado sem nenhum texto por cima"
        >
          Apenas Riscar
        </button>
        <div class="flex items-center gap-1">
          <button
            type="button"
            @click="cancelPendingStrike"
            class="px-2.5 py-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="confirmPendingStrike"
            class="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-xs transition cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>

    <!-- POPOVER FLUTUANTE 2: ESCREVER NOTA NA FOLHA (TEXT TOOL) -->
    <div
      v-if="pendingNote && !readOnly"
      class="note-popover absolute z-50 -translate-x-1/2 -translate-y-full -mt-2 bg-slate-900/95 dark:bg-zinc-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 dark:border-zinc-700 w-72 sm:w-80 backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-auto"
      :style="{
        left: `${Math.max(0.18, Math.min(0.82, pendingNote.x)) * 100}%`,
        top: `${Math.max(0.08, pendingNote.y) * 100}%`
      }"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5 text-xs font-black text-purple-300">
          <span class="material-symbols-rounded text-sm">edit_note</span>
          <span>Anotação na Folha</span>
        </div>
        <button
          type="button"
          @click="cancelPendingNote"
          class="text-slate-400 hover:text-white text-xs h-5 w-5 flex items-center justify-center rounded-md hover:bg-slate-800 transition"
        >
          ✕
        </button>
      </div>

      <textarea
        ref="noteInputRef"
        v-model="noteText"
        rows="2"
        placeholder="Escreva a anotação ou orientação para o aluno..."
        class="w-full px-3 py-2 rounded-xl bg-slate-800 dark:bg-zinc-800 border border-slate-600 dark:border-zinc-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans font-medium resize-none"
        @keydown.ctrl.enter.prevent="confirmPendingNote"
        @keydown.esc.prevent="cancelPendingNote"
      ></textarea>

      <!-- Seletor de Categoria -->
      <div class="mt-2 space-y-1">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Competência / Categoria</span>
        <div class="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-0.5">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            @click="noteCategory = cat.id"
            class="px-2 py-1 rounded-lg text-[10px] font-bold text-left transition truncate cursor-pointer border"
            :class="noteCategory === cat.id ? 'bg-purple-600 border-purple-400 text-white shadow-xs' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-800 text-[11px]">
        <button
          type="button"
          @click="cancelPendingNote"
          class="px-2.5 py-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="!noteText.trim()"
          @click="confirmPendingNote"
          class="px-3.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-xs transition disabled:opacity-40 cursor-pointer"
        >
          Salvar Anotação
        </button>
      </div>
    </div>
  </div>
</template>
