<script setup>
import { useTheme } from '~/composables/useTheme'

const props = defineProps({
  variant: {
    type: String,
    default: 'button'
  },
  size: {
    type: String,
    default: 'md' // 'sm' | 'md' | 'lg'
  }
})

const { isDark, toggleTheme } = useTheme()

function handleQuickToggle() {
  toggleTheme()
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <ClientOnly>
      <!-- BOTÃO RÁPIDO 1-CLIQUE -->
      <button
        type="button"
        :title="isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'"
        :aria-label="isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'"
        class="group relative inline-flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/40 select-none active:scale-95"
        :class="[
          size === 'sm' ? 'h-8 w-8 text-sm' : size === 'lg' ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-base',
          isDark
            ? 'border-zinc-800 bg-zinc-900/90 text-amber-300 hover:bg-zinc-800 hover:border-zinc-700 hover:text-amber-200 shadow-inner'
            : 'border-zinc-200 bg-white/90 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 hover:text-purple-700 shadow-2xs'
        ]"
        @click="handleQuickToggle"
      >
        <span
          v-if="isDark"
          key="dark"
          class="material-symbols-rounded select-none leading-none text-amber-300"
        >
          light_mode
        </span>
        <span
          v-else
          key="light"
          class="material-symbols-rounded select-none leading-none text-zinc-600 group-hover:text-purple-600"
        >
          dark_mode
        </span>
      </button>

      <template #fallback>
        <div
          class="inline-flex items-center justify-center rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 opacity-60"
          :class="size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'"
        >
          <span class="material-symbols-rounded text-sm text-zinc-400">dark_mode</span>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
