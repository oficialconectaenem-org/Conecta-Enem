<script setup>
import { useAuthStore } from '~/stores/auth'

defineProps({
  title: {
    type: String,
    default: 'Painel Administrativo'
  }
})

const emit = defineEmits([
  'open-mobile-sidebar',
  'open-sidebar',
  'toggle-sidebar'
])

const authStore = useAuthStore()

const adminName = computed(() => {
  return (
    authStore.user?.name ||
    'Administrador'
  )
})

const initials = computed(() => {
  const name = adminName.value.trim()
  if (!name) return 'AD'

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#17151f]/95 px-4 backdrop-blur sm:px-6 lg:px-8 transition-colors duration-200"
  >
    <div class="flex items-center gap-4">
      <!-- Mobile toggle button -->
      <button
        type="button"
        aria-label="Abrir menu lateral"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xl text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 lg:hidden cursor-pointer"
        @click="emit('open-mobile-sidebar'); emit('open-sidebar')"
      >
        <span class="material-symbols-rounded text-xl">menu</span>
      </button>

      <div>
        <h1
          class="text-lg font-black text-zinc-900 dark:text-zinc-100 sm:text-xl"
        >
          {{ title }}
        </h1>

        <p
          class="hidden text-xs text-zinc-400 sm:block"
        >
          Gerencie o conteúdo e avaliações do Conecta Enem
        </p>
      </div>
    </div>

    <!-- Actions & Admin User Info -->
    <div
      class="flex items-center gap-3 sm:gap-4"
    >
      <!-- ALTERNAR TEMA -->
      <ThemeToggle />

      <div
        class="hidden text-right sm:block"
      >
        <p
          class="max-w-[180px] truncate text-sm font-bold text-zinc-800 dark:text-zinc-100"
        >
          {{ adminName }}
        </p>

        <p class="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">
          Administrador
        </p>
      </div>

      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/80 text-sm font-black text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/60 shadow-xs"
      >
        {{ initials }}
      </div>
    </div>
  </header>
</template>