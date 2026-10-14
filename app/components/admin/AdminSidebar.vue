<script setup>
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
const adminNavigation = inject('adminNavigation', null)

const navigation = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    to: '/admin',
    section: 'dashboard'
  },
  {
    label: 'Matérias & Módulos',
    icon: 'menu_book',
    to: '/admin/materias',
    section: 'subjects'
  },
  {
    label: 'Banco de Questões',
    icon: 'quiz',
    to: '/admin/questoes',
    section: 'questions'
  },
  {
    label: 'Laboratório de Redação',
    icon: 'edit_note',
    to: '/admin/redacao',
    section: 'redacao'
  },
  {
    label: 'Usuários',
    icon: 'manage_accounts',
    to: '/admin/usuarios',
    section: 'users'
  }
]

function isActive(item) {
  if (route.path === '/admin') {
    if (adminNavigation?.activeSection?.value) {
      return adminNavigation.activeSection.value === item.section
    }
    return item.section === 'dashboard'
  }
  return route.path.startsWith(item.to) && item.to !== '/admin'
}

function handleItemClick(item) {
  if (adminNavigation && route.path === '/admin' && item.section) {
    adminNavigation.changeSection(item.section)
  }

  if (props.mobileOpen) {
    emit('close-mobile')
  }
}

async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
  } finally {
    navigateTo('/login')
  }
}
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{
      'admin-sidebar--collapsed': collapsed,
      'admin-sidebar--mobile-open': mobileOpen
    }"
  >
    <!-- HEADER -->
    <div class="admin-sidebar__header">
      <NuxtLink
        to="/admin"
        class="admin-brand"
        @click="handleItemClick({ to: '/admin', section: 'dashboard' })"
      >
        <span class="admin-brand__icon">
          <img
            src="/images/logo conta.png"
            alt="Logo Conecta Enem"
            class="h-full w-full object-contain"
          />
        </span>

        <span
          v-if="!collapsed"
          class="admin-brand__text"
        >
          <strong>Conecta Enem</strong>
          <small>Administração</small>
        </span>
      </NuxtLink>

      <button
        type="button"
        class="admin-sidebar__collapse"
        :aria-label="collapsed ? 'Expandir menu' : 'Recolher menu'"
        @click="emit('toggle')"
      >
        <span class="material-symbols-rounded">
          {{ collapsed ? 'chevron_right' : 'chevron_left' }}
        </span>
      </button>
    </div>

    <!-- NAVIGATION -->
    <nav class="admin-navigation">
      <div class="admin-navigation__group">
        <span
          v-if="!collapsed"
          class="admin-navigation__title"
        >
          CONTEÚDO
        </span>

        <NuxtLink
          v-for="item in navigation"
          :key="item.label"
          :to="item.to"
          class="admin-nav-item"
          :class="{
            'admin-nav-item--active': isActive(item)
          }"
          :title="collapsed ? item.label : undefined"
          @click="handleItemClick(item)"
        >
          <span class="material-symbols-rounded admin-nav-item__icon">
            {{ item.icon }}
          </span>

          <span
            v-if="!collapsed"
            class="admin-nav-item__label"
          >
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </nav>

    <!-- FOOTER / LOGOUT -->
    <div class="admin-sidebar__footer">
      <button
        type="button"
        class="admin-nav-item admin-nav-item--logout"
        @click="handleLogout"
      >
        <span class="material-symbols-rounded admin-nav-item__icon">
          logout
        </span>

        <span
          v-if="!collapsed"
          class="admin-nav-item__label"
        >
          Sair
        </span>
      </button>
    </div>
  </aside>

  <!-- MOBILE OVERLAY -->
  <Transition name="admin-overlay">
    <button
      v-if="mobileOpen"
      type="button"
      class="admin-mobile-overlay"
      aria-label="Fechar menu"
      @click="emit('close-mobile')"
    ></button>
  </Transition>
</template>

<style scoped>
.admin-sidebar {
  position: fixed;
  z-index: 50;
  inset: 0 auto 0 0;
  width: 260px;
  display: flex;
  flex-direction: column;
  background: var(--admin-sidebar, #fff);
  border-right: 1px solid var(--admin-border, #e8e5ed);
  transition: .22s ease;
}

.admin-sidebar--collapsed {
  width: 82px;
}

.admin-sidebar__header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--admin-border, #e8e5ed);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 0;
  background: none;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.admin-brand__icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  flex-shrink: 0;
  overflow: hidden;
  padding: 2px;
}

.admin-brand__text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.admin-brand__text strong {
  font-size: 13px;
  color: var(--admin-text, #18181b);
}

.admin-brand__text small {
  font-size: 10px;
  color: var(--admin-text-muted, #8b8794);
}

.admin-sidebar__collapse {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--admin-text-muted, #77717f);
}

.admin-sidebar__collapse:hover {
  background: var(--admin-primary-soft, #f7f4fb);
  color: var(--admin-primary, #6d28d9);
}

.admin-navigation {
  flex: 1;
  overflow: auto;
  padding: 18px 10px;
}

.admin-navigation__group + .admin-navigation__group {
  margin-top: 26px;
}

.admin-navigation__title {
  display: block;
  padding: 0 12px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--admin-text-muted, #aaa5b0);
}

.admin-nav-item {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  margin-bottom: 3px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--admin-text-muted, #625d69);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: .15s ease;
}

.admin-sidebar--collapsed .admin-nav-item {
  justify-content: center;
}

.admin-nav-item__icon {
  font-size: 19px;
  color: var(--admin-text-muted, #8b8494);
  flex-shrink: 0;
}

.admin-nav-item:hover {
  background: var(--admin-primary-soft, #f7f4fb);
  color: var(--admin-primary, #6d28d9);
}

.admin-nav-item:hover .admin-nav-item__icon {
  color: var(--admin-primary, #6d28d9);
}

.admin-nav-item--active {
  background: var(--admin-primary-soft, #f3eafd);
  color: var(--admin-primary, #6d28d9);
  font-weight: 650;
}

.admin-nav-item--active .material-symbols-rounded {
  color: var(--admin-primary, #7c3aed);
}

.admin-nav-item--logout {
  color: #ef4444;
}

.admin-nav-item--logout:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.admin-nav-item--logout:hover .admin-nav-item__icon {
  color: #dc2626;
}

.admin-sidebar__footer {
  padding: 10px;
  border-top: 1px solid var(--admin-border, #e8e5ed);
}

.admin-mobile-overlay {
  display: none;
}

@media(max-width: 1023px) {
  .admin-sidebar {
    transform: translateX(-100%);
    box-shadow: 20px 0 50px rgba(0, 0, 0, .12);
  }

  .admin-sidebar--mobile-open {
    transform: translateX(0);
  }

  .admin-mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgba(20, 16, 25, .45);
  }
}
</style>