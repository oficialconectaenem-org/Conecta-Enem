<script setup>
import TeacherSidebar from '~/components/professor/TeacherSidebar.vue'
import TeacherTopbar from '~/components/professor/TeacherTopbar.vue'

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function openMobileSidebar() {
  mobileSidebarOpen.value = true
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}
</script>

<template>
  <div class="teacher-shell min-h-screen bg-slate-50 dark:bg-[#09080e] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
    <!-- Overlay / Backdrop para Mobile -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-2xs lg:hidden cursor-pointer"
        @click="closeMobileSidebar"
      />
    </Transition>

    <TeacherSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileSidebarOpen"
      @toggle="toggleSidebar"
      @close-mobile="closeMobileSidebar"
    />

    <div
      class="min-h-screen transition-[margin-left] duration-200"
      :class="sidebarCollapsed ? 'lg:ml-[82px]' : 'lg:ml-[260px]'"
    >
      <TeacherTopbar
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
        @open-mobile-sidebar="openMobileSidebar"
      />

      <main class="min-h-[calc(100vh-72px)] p-4 sm:p-7">
        <div class="w-full max-w-[1400px] mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.teacher-shell {
  min-height: 100vh;
}
</style>
