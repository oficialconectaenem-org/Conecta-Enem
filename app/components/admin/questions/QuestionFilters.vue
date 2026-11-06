<script setup>
const props = defineProps({
  filters: {
    type: Object,
    default: () => ({
      search: '',
      subjectId: '',
      difficulty: '',
      status: '',
      year: ''
    })
  },

  subjects: {
    type: Array,
    default: () => []
  },

  availableYears: {
    type: Array,
    default: () => []
  },

  hasFilters: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update',
  'clear',
  'search'
])

const localSearch = ref(props.filters?.search || '')

watch(
  () => props.filters?.search,
  (value) => {
    if (value !== localSearch.value) {
      localSearch.value = value || ''
    }
  }
)

const update = (key, value) => {
  emit('update', {
    ...(props.filters || {}),
    [key]: value
  })
}

const onSearchInput = () => {
  update('search', localSearch.value)
}

const clearSearch = () => {
  localSearch.value = ''
  update('search', '')
}
</script>

<template>
  <section
    class="mb-6 rounded-2xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-card,#ffffff)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
  >
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]">

      <!-- SEARCH -->
      <div class="relative">
        <span
          class="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[var(--admin-text-muted,#77727f)]"
        >
          search
        </span>

        <input
          v-model="localSearch"
          type="search"
          placeholder="Buscar no enunciado ou título..."
          class="h-11 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] pl-10 pr-10 text-sm outline-none transition placeholder:text-[var(--admin-text-muted,#aaa6b0)] focus:border-[var(--admin-primary,#6d28d9)] focus:ring-3 focus:ring-[var(--admin-primary-soft,#f3e8ff)]"
          @input="onSearchInput"
        />

        <button
          v-if="localSearch"
          type="button"
          aria-label="Limpar busca"
          class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--admin-text-muted,#77727f)] hover:bg-gray-100 cursor-pointer"
          @click="clearSearch"
        >
          <span class="material-symbols-rounded text-[18px]">
            close
          </span>
        </button>
      </div>

      <!-- SUBJECT -->
      <select
        :value="filters?.subjectId || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)]"
        @change="update('subjectId', $event.target.value)"
      >
        <option value="">
          Todas as matérias
        </option>

        <option
          v-for="subject in subjects"
          :key="subject.id"
          :value="subject.id"
        >
          {{ subject.name || subject.title }}
        </option>
      </select>

      <!-- DIFFICULTY -->
      <select
        :value="filters?.difficulty || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)]"
        @change="update('difficulty', $event.target.value)"
      >
        <option value="">
          Todas as dificuldades
        </option>

        <option value="EASY">
          Fácil
        </option>

        <option value="MEDIUM">
          Média
        </option>

        <option value="HARD">
          Difícil
        </option>
      </select>

      <!-- ANO -->
      <select
        :value="filters?.year || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)]"
        @change="update('year', $event.target.value)"
      >
        <option value="">
          Todos os anos
        </option>

        <option
          v-for="year in availableYears"
          :key="year"
          :value="year"
        >
          ENEM {{ year }}
        </option>
      </select>

      <!-- STATUS -->
      <select
        :value="filters?.status || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)]"
        @change="update('status', $event.target.value)"
      >
        <option value="">
          Todos os status
        </option>

        <option value="ACTIVE">
          Ativa
        </option>

        <option value="INACTIVE">
          Inativa
        </option>
      </select>

      <!-- CLEAR -->
      <button
        v-if="hasFilters"
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--admin-border,#e9e7ee)] px-4 text-sm font-semibold text-[var(--admin-text-muted,#77727f)] transition hover:bg-[var(--admin-primary-soft,#f3e8ff)] hover:text-[var(--admin-primary,#6d28d9)] cursor-pointer"
        @click="emit('clear')"
      >
        <span class="material-symbols-rounded text-[19px]">
          filter_alt_off
        </span>

        <span>Limpar</span>
      </button>
    </div>
  </section>
</template>
