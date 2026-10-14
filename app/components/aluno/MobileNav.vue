<script setup>
const route = useRoute()

const items = [
  {
    name: 'Início',
    icon: 'home',
    path: '/aluno'
  },
  {
    name: 'Redações',
    icon: 'description',
    path: '/aluno/redacao'
  },
  {
    name: 'Questões',
    icon: 'check_box',
    path: '/aluno/questoes'
  },
  {
    name: 'Estude',
    icon: 'menu_book',
    path: '/aluno/aulas'
  },
  {
    name: 'Perfil',
    icon: 'person',
    path: '/aluno/perfil'
  }
]

function isActive(path) {
  if (path === '/aluno') {
    return route.path === '/aluno'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <!-- Barra de Navegação Inferior para Smartphones e Tablets (< 1024px) -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--student-border)] bg-[var(--student-surface)]/95 px-3 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl lg:hidden shadow-[0_-8px_30px_rgba(30,20,55,.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,.4)] transition-colors duration-200"
  >
    <div class="flex w-full max-w-lg items-center justify-around mx-auto">
      <NuxtLink
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        class="student-focus-ring flex min-w-[56px] min-h-[44px] flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95"
        :class="
          isActive(item.path)
            ? 'text-[var(--student-primary-text)] font-black'
            : 'text-[var(--student-text-secondary)] font-semibold hover:text-[var(--student-text)]'
        "
      >
        <div
          class="flex h-8 w-12 items-center justify-center rounded-2xl transition-all duration-200"
          :class="
            isActive(item.path)
              ? 'bg-[var(--student-primary-soft)] scale-105 shadow-2xs'
              : 'bg-transparent'
          "
        >
          <span class="material-symbols-rounded text-2xl select-none">
            {{ item.icon }}
          </span>
        </div>

        <span class="mt-0.5 text-[11px] tracking-tight select-none leading-none">
          {{ item.name }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>
