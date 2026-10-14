<script setup>
import { useAuthStore } from '~/stores/auth'

const props = defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle-sidebar',
  'open-mobile-sidebar'
])

const authStore = useAuthStore()
const teacherName = computed(() => authStore.user?.name || 'Professor')

const initials = computed(() => {
  const name = teacherName.value.trim()
  if (!name) return 'PR'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
})
</script>

<template>
  <header class="teacher-topbar sticky top-0 z-30 h-[72px] px-4 sm:px-7 flex items-center justify-between bg-white dark:bg-[#0f1015] border-b border-slate-200 dark:border-zinc-800 transition-colors duration-200">
    <div class="flex items-center gap-3">
      <!-- Mobile menu trigger -->
      <button
        type="button"
        class="w-[38px] h-[38px] flex lg:hidden items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
        aria-label="Abrir menu"
        @click="emit('open-mobile-sidebar')"
      >
        <span class="material-symbols-rounded">menu</span>
      </button>

      <!-- Desktop collapse trigger -->
      <button
        type="button"
        class="w-[38px] h-[38px] hidden lg:flex items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
        :aria-label="sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
        @click="emit('toggle-sidebar')"
      >
        <span class="material-symbols-rounded">
          {{ sidebarCollapsed ? 'dock_to_right' : 'dock_to_left' }}
        </span>
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-black text-xs border border-purple-200/60 dark:border-purple-800/40">
          {{ initials }}
        </div>
        <div class="hidden sm:block text-left">
          <p class="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-none">{{ teacherName }}</p>
          <span class="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Professor</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.teacher-topbar {
  position: sticky;
}
</style>
