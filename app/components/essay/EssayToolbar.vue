<script setup>
const props = defineProps({
  activeTool: {
    type: String,
    default: 'select' // 'select', 'correct', 'pen', 'highlighter', 'underline', 'strike', 'circle', 'arrow', 'comment', 'eraser'
  },
  activeColor: {
    type: String,
    default: '#dc2626' // red-600 default for teacher
  },
  activeStrokeWidth: {
    type: Number,
    default: 3
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  },
  zoom: {
    type: Number,
    default: 100
  },
  savingStatus: {
    type: String,
    default: 'saved' // 'saved', 'saving', 'unsaved', 'error'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  showAnnotations: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'update:activeTool',
  'update:activeColor',
  'update:activeStrokeWidth',
  'update:showAnnotations',
  'undo',
  'redo',
  'clear-all',
  'zoom-in',
  'zoom-out',
  'zoom-reset',
  'open-rubric'
])

const tools = [
  { id: 'select', label: 'Cursor Normal / Seleção', icon: 'near_me' },
  { id: 'correct', label: '✍️ Riscar & Escrever em Cima (Recomendado)', icon: 'spellcheck', badge: 'PRO' },
  { id: 'pen', label: 'Caneta Livre', icon: 'edit' },
  { id: 'highlighter', label: 'Marca-texto', icon: 'ink_highlighter' },
  { id: 'underline', label: 'Sublinhar', icon: 'format_underlined' },
  { id: 'strike', label: 'Riscar / Tachar Simples', icon: 'strikethrough_s' },
  { id: 'comment', label: 'Comentário Marginal', icon: 'add_comment' },
  { id: 'eraser', label: 'Borracha', icon: 'ink_eraser' }
]

const colors = [
  { hex: '#dc2626', name: 'Vermelho Correção', bgClass: 'bg-red-600' },
  { hex: '#f59e0b', name: 'Amarelo Atenção', bgClass: 'bg-amber-500' },
  { hex: '#2563eb', name: 'Azul Destaque', bgClass: 'bg-blue-600' },
  { hex: '#16a34a', name: 'Verde Positivo', bgClass: 'bg-emerald-600' },
  { hex: '#7c3aed', name: 'Roxo Estrutural', bgClass: 'bg-purple-600' }
]

const strokeWidths = [
  { size: 2, label: 'Fina' },
  { size: 3, label: 'Média' },
  { size: 5, label: 'Grossa' }
]
</script>

<template>
  <div class="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2 shadow-2xs overflow-x-auto transition-colors duration-200">
    <!-- Bloco Esquerdo: Ferramentas de Desenho e Anotação (Professor) -->
    <div v-if="!readOnly" class="flex items-center gap-1.5 shrink-0 py-0.5">
      <!-- Grupo de Ferramentas Principais -->
      <div class="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60 gap-0.5">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          :title="tool.label"
          @click="emit('update:activeTool', tool.id)"
          class="relative flex h-8 items-center justify-center rounded-xl px-2 sm:px-2.5 text-slate-700 dark:text-zinc-300 transition cursor-pointer gap-1.5"
          :class="[
            activeTool === tool.id
              ? tool.id === 'correct'
                ? 'bg-purple-700 dark:bg-purple-600 text-white shadow-md font-black ring-2 ring-purple-400'
                : 'bg-purple-600 text-white shadow-xs font-black'
              : tool.id === 'correct'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-300 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/60'
                : 'hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100'
          ]"
        >
          <span class="material-symbols-rounded text-[18px] sm:text-[20px]">{{ tool.icon }}</span>
          <span v-if="tool.id === 'correct'" class="text-[11px] font-black hidden xl:inline">Riscar & Escrever</span>
          <span v-if="tool.badge && activeTool !== tool.id" class="text-[9px] font-black bg-purple-600 text-white px-1 rounded-full hidden sm:inline">{{ tool.badge }}</span>
        </button>
      </div>

      <!-- Divisor -->
      <div class="h-6 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5 hidden sm:block"></div>

      <!-- Seletor de Cores -->
      <div class="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
        <button
          v-for="color in colors"
          :key="color.hex"
          type="button"
          :title="color.name"
          @click="emit('update:activeColor', color.hex)"
          class="h-6 w-6 rounded-xl transition flex items-center justify-center cursor-pointer border"
          :class="[
            color.bgClass,
            activeColor === color.hex ? 'ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-zinc-900 scale-110' : 'border-black/10 hover:scale-105'
          ]"
        >
          <span v-if="activeColor === color.hex" class="material-symbols-rounded text-white text-[13px]">check</span>
        </button>
      </div>

      <!-- Espessura do Traço (para Caneta/Marca-texto) -->
      <div v-if="activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'circle' || activeTool === 'arrow'" class="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
        <button
          v-for="sw in strokeWidths"
          :key="sw.size"
          type="button"
          :title="`Espessura ${sw.label}`"
          @click="emit('update:activeStrokeWidth', sw.size)"
          class="px-2 py-0.5 text-[11px] font-bold rounded-lg transition"
          :class="activeStrokeWidth === sw.size ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-300 shadow-2xs' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'"
        >
          {{ sw.label }}
        </button>
      </div>

      <!-- Desfazer / Refazer -->
      <div class="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
        <button
          type="button"
          title="Desfazer (Ctrl+Z)"
          :disabled="!canUndo"
          @click="emit('undo')"
          class="flex h-7.5 w-7.5 items-center justify-center rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-[18px]">undo</span>
        </button>
        <button
          type="button"
          title="Refazer (Ctrl+Shift+Z)"
          :disabled="!canRedo"
          @click="emit('redo')"
          class="flex h-7.5 w-7.5 items-center justify-center rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-[18px]">redo</span>
        </button>
      </div>
    </div>

    <!-- Se Modo Leitura (Aluno ou Prévia) -->
    <div v-else class="flex items-center gap-2 shrink-0">
      <div class="hidden sm:flex items-center gap-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-[11px] font-bold">
        <span class="material-symbols-rounded text-sm">visibility</span>
        <span>Modo Visualização</span>
      </div>

      <button
        type="button"
        @click="emit('update:showAnnotations', !showAnnotations)"
        class="flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap"
        :class="showAnnotations ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700'"
      >
        <span class="material-symbols-rounded text-sm">{{ showAnnotations ? 'layers' : 'layers_clear' }}</span>
        <span>{{ showAnnotations ? 'Ocultar Marcações' : 'Mostrar Marcações' }}</span>
      </button>
    </div>

    <!-- Bloco Direito: Zoom, Status de Salvamento & Botão Competências -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Status de Autosave -->
      <div v-if="!readOnly" class="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-zinc-700/60 bg-slate-50/50 dark:bg-zinc-800/50">
        <template v-if="savingStatus === 'saving'">
          <span class="material-symbols-rounded animate-spin text-[16px] text-purple-600 dark:text-purple-400">progress_activity</span>
          <span class="text-purple-700 dark:text-purple-300 font-bold">Salvando...</span>
        </template>
        <template v-else-if="savingStatus === 'saved'">
          <span class="material-symbols-rounded text-[16px] text-emerald-600 dark:text-emerald-400 font-bold">cloud_done</span>
          <span class="text-emerald-700 dark:text-emerald-300 font-bold">Salvo</span>
        </template>
        <template v-else-if="savingStatus === 'unsaved'">
          <span class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-amber-700 dark:text-amber-400 font-bold">Alterações pendentes</span>
        </template>
        <template v-else>
          <span class="material-symbols-rounded text-[16px] text-red-500 dark:text-red-400">error</span>
          <span class="text-red-700 dark:text-red-400 font-bold">Erro ao salvar</span>
        </template>
      </div>

      <!-- Controles de Zoom -->
      <div class="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 sm:p-1 rounded-2xl border border-slate-200 dark:border-zinc-700/60">
        <button
          type="button"
          title="Diminuir Zoom"
          @click="emit('zoom-out')"
          class="flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-sm sm:text-base">remove</span>
        </button>
        <button
          type="button"
          title="Resetar Zoom para 100%"
          @click="emit('zoom-reset')"
          class="px-1.5 text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-400 transition cursor-pointer"
        >
          {{ zoom }}%
        </button>
        <button
          type="button"
          title="Aumentar Zoom"
          @click="emit('zoom-in')"
          class="flex h-6.5 w-6.5 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
        >
          <span class="material-symbols-rounded text-sm sm:text-base">add</span>
        </button>
      </div>

      <!-- Botão Abrir Painel de Critérios (Competências ENEM) -->
      <button
        v-if="!readOnly"
        type="button"
        @click="emit('open-rubric')"
        class="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-3 py-1.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition cursor-pointer active:scale-98 shrink-0"
      >
        <span class="material-symbols-rounded text-sm">assignment</span>
        <span class="hidden sm:inline">Avaliar Competências</span>
        <span class="sm:hidden">ENEM</span>
      </button>
    </div>
  </div>
</template>
