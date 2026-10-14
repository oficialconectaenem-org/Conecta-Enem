<script setup>
import '../assets/css/student-theme.css'

import AlunoSidebar from '../components/aluno/Sidebar.vue'
import AlunoHeader from '../components/aluno/Header.vue'
import AlunoMobileNav from '../components/aluno/MobileNav.vue'
import { useStudentShell } from '../composables/useStudentShell'

const {
  sidebarCollapsed,
  toggleSidebar
} = useStudentShell()
</script>

<template>
  <div class="student-shell min-h-dvh">
    <div class="student-shell__ambient" aria-hidden="true" />

    <!-- SIDEBAR DESKTOP -->
    <AlunoSidebar
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <!-- CONTEÚDO -->
    <div
      class="relative z-10 min-h-dvh min-w-0 transition-[margin] duration-300 ease-out"
      :class="sidebarCollapsed ? 'lg:ml-[88px]' : 'lg:ml-[280px]'"
    >
      <AlunoHeader />

      <main class="student-page-content min-w-0 overflow-x-hidden">
        <slot />
      </main>
    </div>

    <!-- NAVEGAÇÃO MOBILE -->
    <AlunoMobileNav />
  </div>
</template>
