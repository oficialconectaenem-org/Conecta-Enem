<script setup>import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  mobileOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle',
  'close-mobile'
])

const route = useRoute()
const authStore = useAuthStore()
const { logout } = useAuth()
const loggingOut = ref(false)

const teacherName = computed(() => authStore.user?.name || 'Professor')

const initials = computed(() => {
  const name = teacherName.value.trim()
  if (!name) return 'PR'
  return name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
})

const navigation = [
  {
    label: 'Turmas & Visão Geral',
    icon: 'groups',
    to: '/professor'
  },
  {
    label: 'Redações',
    icon: 'edit_note',
    to: '/professor/redacoes'
  },
  {
    label: 'Relatórios',
    icon: 'insights',
    to: '/professor/relatorios'
  }
]

function isActive(to) {
  if (to === '/professor') {
    return route.path === '/professor' || route.path.startsWith('/professor/turmas')
  }
  return route.path.startsWith(to)
}

function handleItemClick() {
  if (props.mobileOpen) {
    emit('close-mobile')
  }
}

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await logout()
  } catch (err) {
    console.error('Erro ao sair:', err)
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <aside
    class="teacher-sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-[#0f1015] border-r border-slate-200 dark:border-zinc-800 transition-all duration-200"
    :class="{
      'w-[82px]': collapsed,
      'w-[260px]': !collapsed,
      '-translate-x-full lg:translate-x-0': !mobileOpen,
      'translate-x-0': mobileOpen
    }"
  >
    <!-- HEADER / BRAND -->
    <div class="h-[72px] px-4 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
      <NuxtLink
        to="/professor"
        class="flex items-center gap-3 no-underline text-inherit"
        @click="handleItemClick"
      >
        <span class="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/50 shrink-0 overflow-hidden p-0.5">
          <img
            src="/images/logo conta.png"
            alt="Logo Conecta Enem"
            class="h-full w-full object-contain"
          />
        </span>

        <span
          v-if="!collapsed"
          class="flex flex-col text-left"
        >
          <strong class="text-xs font-black text-slate-900 dark:text-zinc-100 leading-tight">Conecta Enem</strong>
          <small class="text-[11px] font-bold text-purple-600 dark:text-purple-400">Painel do Professor</small>
        </span>
      </NuxtLink>

      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center rounded-lg border-0 bg-transparent text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 transition cursor-pointer"
        :aria-label="collapsed ? 'Expandir menu' : 'Recolher menu'"
        @click="emit('toggle')"
      >
        <span class="material-symbols-rounded text-xl">
          {{ collapsed ? 'chevron_right' : 'chevron_left' }}
        </span>
      </button>
    </div>

    <!-- NAVIGATION LINKS -->
    <nav class="flex-1 overflow-y-auto px-3 py-5 space-y-6">
      <div>
        <span
          v-if="!collapsed"
          class="block px-3 pb-2.5 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-zinc-500 uppercase"
        >
          MENU PRINCIPAL
        </span>

        <NuxtLink
          v-for="item in navigation"
          :key="item.label"
          :to="item.to"
          class="flex items-center gap-3 px-3 h-11 mb-1 rounded-xl font-semibold text-xs transition duration-150 no-underline cursor-pointer"
          :class="[
            collapsed ? 'justify-center px-0' : '',
            isActive(item.to)
              ? 'bg-purple-100/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300'
          ]"
          :title="collapsed ? item.label : undefined"
          @click="handleItemClick"
        >
          <span
            class="material-symbols-rounded text-xl shrink-0"
            :class="isActive(item.to) ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-zinc-500'"
          >
            {{ item.icon }}
          </span>

          <span v-if="!collapsed">
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </nav>

    <!-- FOOTER / USER & LOGOUT -->
    <div class="p-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col gap-2 shrink-0">
      <div
        v-if="!collapsed"
        class="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl"
      >
        <div class="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-black text-xs shrink-0">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate" :title="teacherName">{{ teacherName }}</p>
          <span class="block text-[10px] text-slate-500 dark:text-zinc-400 leading-none">Docente de Redação</span>
        </div>
      </div>

      <button
        type="button"
        class="w-full h-11 flex items-center gap-3 px-3 rounded-xl font-semibold text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer border-0 bg-transparent"
        :class="collapsed ? 'justify-center px-0' : ''"
        :title="collapsed ? 'Sair' : undefined"
        @click="handleLogout"
      >
        <span class="material-symbols-rounded text-xl shrink-0 text-red-500 dark:text-red-400">
          logout
        </span>

        <span v-if="!collapsed">
          Sair
        </span>
      </button>
    </div>
  </aside>

  <!-- MOBILE OVERLAY -->
  <Transition name="teacher-overlay">
    <button
      v-if="mobileOpen"
      type="button"
      class="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs lg:hidden border-0"
      aria-label="Fechar menu"
      @click="emit('close-mobile')"
    ></button>
  </Transition>
</template>

<style scoped>
.teacher-sidebar {
  position: fixed;
}
</style>
