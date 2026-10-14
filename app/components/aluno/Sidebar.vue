<script setup>
const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle'
])

const route = useRoute()

const navigation = [
  {
    label: 'Home',
    to: '/aluno',
    icon: 'material-symbols:home'
  },
  {
    label: 'Questões',
    to: '/aluno/questoes',
    icon: 'material-symbols:quiz'
  },
  {
    label: 'Aulas',
    to: '/aluno/aulas',
    icon: 'material-symbols:play-circle'
  },
  {
    label: 'Redação',
    to: '/aluno/redacao',
    icon: 'material-symbols:edit-note'
  },
  {
    label: 'Perfil',
    to: '/aluno/perfil',
    icon: 'material-symbols:person'
  }
]

function isActive(path) {
  if (path === '/aluno') {
    return route.path === '/aluno'
  }

  return route.path.startsWith(path)
}

const { logout } = useAuth()
const loggingOut = ref(false)

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

function toggle() {
  emit('toggle')
}
</script>


<template>
  <aside
    class="
      fixed
      inset-y-0
      left-0
      z-40
      hidden
      flex-col
      border-r
      border-[var(--student-border)]
      bg-[var(--student-sidebar)]
      transition-[width,background-color,border-color]
      duration-300
      lg:flex
    "
    :class="
      props.collapsed
        ? 'w-[88px]'
        : 'w-[280px]'
    "
  >
    <!-- LOGO -->
    <div
      class="
        flex
        h-[72px]
        shrink-0
        items-center
        border-b
        border-[var(--student-border)]
        px-4
      "
      :class="
        props.collapsed
          ? 'justify-center'
          : 'justify-between'
      "
    >
      <NuxtLink
        to="/aluno"
        class="
          flex
          min-w-0
          items-center
          gap-3
        "
      >
        <div
          class="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-2xl
            overflow-hidden
            p-0.5
            bg-[var(--student-surface-secondary)]
            border
            border-[var(--student-border)]
            shadow-xs
          "
        >
          <img
            src="/images/logo conta.png"
            alt="Logo Conecta Enem"
            class="h-full w-full object-contain"
          />
        </div>

        <div
          v-if="!props.collapsed"
          class="min-w-0"
        >
          <p
            class="
              truncate
              text-base
              font-black
              tracking-tight
              text-[var(--student-text)]
            "
          >
            Conecta Enem
          </p>

          <p
            class="
              mt-0.5
              text-xs
              font-medium
              text-[var(--student-text-muted)]
            "
          >
            Área do aluno
          </p>
        </div>
      </NuxtLink>

      <button
        v-if="!props.collapsed"
        type="button"
        aria-label="Recolher menu"
        class="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-xl
          text-[var(--student-text-secondary)]
          transition
          hover:bg-[var(--student-primary-soft)]
          hover:text-[var(--student-primary-text)]
        "
        @click="toggle"
      >
        <Icon
          name="material-symbols:keyboard-double-arrow-left"
          class="text-xl"
        />
      </button>
    </div>


    <!-- LINKS -->
    <nav
      class="
        flex-1
        overflow-y-auto
        px-3
        py-5
      "
    >
      <div class="space-y-1.5">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :title="
            props.collapsed
              ? item.label
              : undefined
          "
          class="
            student-nav-item
            relative
            flex
            min-h-12
            items-center
            rounded-xl
            font-semibold
          "
          :class="[
            props.collapsed
              ? 'justify-center px-3'
              : 'gap-3 px-4',

            isActive(item.to)
              ? 'student-nav-item-active'
              : ''
          ]"
        >
          <Icon
            :name="item.icon"
            class="
              shrink-0
              text-[23px]
            "
          />

          <span
            v-if="!props.collapsed"
            class="
              truncate
              text-sm
            "
          >
            {{ item.label }}
          </span>

          <span
            v-if="
              isActive(item.to) &&
              !props.collapsed
            "
            class="
              absolute
              right-3
              h-1.5
              w-1.5
              rounded-full
              bg-[var(--student-primary)]
            "
          />
        </NuxtLink>
      </div>
    </nav>


    <!-- RECOLHER / EXPANDIR -->
    <div
      class="
        shrink-0
        border-t
        border-[var(--student-border)]
        p-3
        space-y-2
      "
    >
      <!-- BOTÃO SAIR / ENCERRAR SESSÃO -->
      <button
        type="button"
        @click="handleLogout"
        :disabled="loggingOut"
        :title="props.collapsed ? 'Encerrar sessão' : undefined"
        class="
          flex
          h-11
          w-full
          items-center
          gap-3
          rounded-xl
          border
          border-red-500/20
          bg-red-500/10
          font-bold
          text-red-600
          dark:text-red-400
          transition
          hover:bg-red-500/20
          cursor-pointer
          disabled:opacity-50
        "
        :class="
          props.collapsed
            ? 'justify-center px-3'
            : 'px-4'
        "
      >
        <span class="material-symbols-rounded text-xl shrink-0">logout</span>

        <span
          v-if="!props.collapsed"
          class="text-sm truncate"
        >
          Sair da conta
        </span>
      </button>

      <button
        type="button"
        class="
          flex
          h-11
          w-full
          items-center
          justify-center
          gap-3
          rounded-xl
          bg-[var(--student-primary-soft)]
          font-bold
          text-[var(--student-primary-text)]
          transition
          hover:bg-[var(--student-primary-soft-hover)]
        "
        @click="toggle"
      >
        <Icon
          :name="
            props.collapsed
              ? 'material-symbols:keyboard-double-arrow-right'
              : 'material-symbols:keyboard-double-arrow-left'
          "
          class="text-xl"
        />

        <span
          v-if="!props.collapsed"
          class="text-sm"
        >
          Recolher menu
        </span>
      </button>
    </div>
  </aside>
</template>