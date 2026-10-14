<script setup>
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import AdminTopbar from '~/components/admin/AdminTopbar.vue'

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
  <div class="admin-shell">
    <AdminSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileSidebarOpen"
      @toggle="toggleSidebar"
      @close-mobile="closeMobileSidebar"
    />

    <div
      class="admin-main"
      :class="{
        'admin-main--collapsed': sidebarCollapsed
      }"
    >
      <AdminTopbar
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
        @open-mobile-sidebar="openMobileSidebar"
      />

      <main class="admin-content">
        <div class="admin-content-inner">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: var(--admin-bg, #f8f7fb);
  color: var(--admin-text, #18151f);
}

.admin-main {
  min-height: 100vh;
  margin-left: 260px;
  transition: margin-left 220ms ease;
}

.admin-main--collapsed {
  margin-left: 82px;
}

.admin-content {
  min-height: calc(100vh - 72px);
  padding: 28px;
}

.admin-content-inner {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

@media (max-width: 1023px) {
  .admin-main,
  .admin-main--collapsed {
    margin-left: 0;
  }

  .admin-content {
    padding: 20px 16px 32px;
  }
}
</style>