<script setup>
const props = defineProps({
  filters: {
    type: Object,
    default: () => ({
      search: '',
      subjectId: '',
      difficulty: '',
      status: '',
      year: '',
      hasImages: '',
      hasExplanation: '',
      sort: 'year_desc'
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

  totalCount: {
    type: Number,
    default: 0
  },

  filteredCount: {
    type: Number,
    default: 0
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
const showAdvanced = ref(false)

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

let searchDebounceTimer = null
const onSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    update('search', localSearch.value)
  }, 250)
}

const clearSearch = () => {
  localSearch.value = ''
  update('search', '')
}

const getSubjectName = (id) => {
  const sub = props.subjects.find(s => s.id === id)
  return sub ? (sub.name || sub.title) : id
}

const removeFilter = (key) => {
  if (key === 'search') {
    clearSearch()
  } else {
    update(key, '')
  }
}

// Preset rápido para conveniência do Admin
const applyPreset = (preset) => {
  if (preset === 'NO_EXPLANATION') {
    emit('update', {
      ...(props.filters || {}),
      hasExplanation: 'false'
    })
  } else if (preset === 'WITH_IMAGES') {
    emit('update', {
      ...(props.filters || {}),
      hasImages: 'true'
    })
  } else if (preset === 'INACTIVE') {
    emit('update', {
      ...(props.filters || {}),
      status: 'INACTIVE'
    })
  }
}
</script>

<template>
  <section
    class="mb-6 rounded-2xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-card,#ffffff)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900"
  >
    <!-- BARRA PRINCIPAL DE FILTROS -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.8fr)_repeat(3,minmax(130px,1fr))_auto]">

      <!-- BUSCA TEXTUAL EXPANDIDA -->
      <div class="relative">
        <span
          class="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[var(--admin-text-muted,#77727f)]"
        >
          search
        </span>

        <input
          v-model="localSearch"
          type="search"
          placeholder="Buscar no enunciado, título ou alternativas..."
          class="h-11 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] pl-10 pr-10 text-sm outline-none transition placeholder:text-[var(--admin-text-muted,#aaa6b0)] focus:border-[var(--admin-primary,#6d28d9)] focus:ring-3 focus:ring-[var(--admin-primary-soft,#f3e8ff)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          @input="onSearchInput"
        />

        <button
          v-if="localSearch"
          type="button"
          aria-label="Limpar busca"
          class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--admin-text-muted,#77727f)] hover:bg-gray-100 dark:hover:bg-zinc-800"
          @click="clearSearch"
        >
          <span class="material-symbols-rounded text-[18px]">
            close
          </span>
        </button>
      </div>

      <!-- MATÉRIA -->
      <select
        :value="filters?.subjectId || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

      <!-- ANO ENEM -->
      <select
        :value="filters?.year || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

      <!-- DIFICULDADE -->
      <select
        :value="filters?.difficulty || ''"
        class="h-11 rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-sm outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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

      <!-- BOTÃO TOGGLE FILTROS AVANÇADOS -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border,#e9e7ee)] px-3.5 text-xs font-bold transition hover:bg-[var(--admin-primary-soft,#f3e8ff)] hover:text-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          :class="showAdvanced ? 'bg-[var(--admin-primary-soft,#f3e8ff)] text-[var(--admin-primary,#6d28d9)] dark:bg-purple-950/60 dark:text-purple-300' : ''"
          @click="showAdvanced = !showAdvanced"
        >
          <span class="material-symbols-rounded text-[18px]">
            tune
          </span>
          <span class="hidden sm:inline">Mais filtros</span>
          <span
            class="material-symbols-rounded text-[16px] transition-transform duration-200"
            :class="showAdvanced ? 'rotate-180' : ''"
          >
            expand_more
          </span>
        </button>

        <!-- LIMPAR TUDO -->
        <button
          v-if="hasFilters"
          type="button"
          title="Limpar todos os filtros"
          class="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400"
          @click="emit('clear')"
        >
          <span class="material-symbols-rounded text-[18px]">
            filter_alt_off
          </span>
          <span class="hidden sm:inline">Limpar</span>
        </button>
      </div>
    </div>

    <!-- PAINEL DE FILTROS AVANÇADOS (EXPANSÍVEL) -->
    <div
      v-if="showAdvanced"
      class="mt-3.5 grid gap-3 border-t border-[var(--admin-border,#e9e7ee)] pt-3.5 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800"
    >
      <!-- STATUS ATIVA/INATIVA -->
      <div>
        <label class="mb-1 block text-xs font-bold text-[var(--admin-text-muted,#77727f)]">Status de Publicação</label>
        <select
          :value="filters?.status || ''"
          class="h-10 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-xs outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          @change="update('status', $event.target.value)"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativa</option>
          <option value="INACTIVE">Inativa</option>
        </select>
      </div>

      <!-- COM / SEM IMAGENS -->
      <div>
        <label class="mb-1 block text-xs font-bold text-[var(--admin-text-muted,#77727f)]">Recursos Visuais</label>
        <select
          :value="filters?.hasImages || ''"
          class="h-10 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-xs outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          @change="update('hasImages', $event.target.value)"
        >
          <option value="">Todas (com e sem imagens)</option>
          <option value="true">Apenas com figuras/gráficos</option>
          <option value="false">Apenas texto puro</option>
        </select>
      </div>

      <!-- COM / SEM RESOLUÇÃO -->
      <div>
        <label class="mb-1 block text-xs font-bold text-[var(--admin-text-muted,#77727f)]">Gabarito Comentado</label>
        <select
          :value="filters?.hasExplanation || ''"
          class="h-10 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-xs outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          @change="update('hasExplanation', $event.target.value)"
        >
          <option value="">Todas as resoluções</option>
          <option value="true">Com resolução comentada</option>
          <option value="false">Sem resolução (pendentes)</option>
        </select>
      </div>

      <!-- ORDENAÇÃO -->
      <div>
        <label class="mb-1 block text-xs font-bold text-[var(--admin-text-muted,#77727f)]">Ordenação</label>
        <select
          :value="filters?.sort || 'year_desc'"
          class="h-10 w-full rounded-xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-input,#ffffff)] px-3 text-xs outline-none transition focus:border-[var(--admin-primary,#6d28d9)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          @change="update('sort', $event.target.value)"
        >
          <option value="year_desc">Ano ENEM (Mais recente primeiro)</option>
          <option value="year_asc">Ano ENEM (Mais antigo primeiro)</option>
          <option value="newest">Mais recentes adicionadas</option>
          <option value="oldest">Mais antigas adicionadas</option>
          <option value="difficulty_desc">Dificuldade (Difícil → Fácil)</option>
          <option value="difficulty_asc">Dificuldade (Fácil → Difícil)</option>
        </select>
      </div>
    </div>

    <!-- ATALHOS RÁPIDOS & TAGS ATIVAS -->
    <div class="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-border,#e9e7ee)] pt-3 text-xs dark:border-zinc-800">
      <!-- ATALHOS RÁPIDOS -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[var(--admin-text-muted,#77727f)] font-semibold">Atalhos:</span>
        <button
          type="button"
          class="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200 transition hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300"
          @click="applyPreset('NO_EXPLANATION')"
        >
          ⚠️ Sem Resolução
        </button>
        <button
          type="button"
          class="rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 border border-sky-200 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-300"
          @click="applyPreset('WITH_IMAGES')"
        >
          🖼️ Com Imagens
        </button>
        <button
          type="button"
          class="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 border border-zinc-200 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
          @click="applyPreset('INACTIVE')"
        >
          🚫 Inativas
        </button>
      </div>

      <!-- CONTADOR DE RESULTADOS -->
      <div class="text-[var(--admin-text-muted,#77727f)] font-medium">
        Mostrando <strong class="text-zinc-900 dark:text-zinc-100">{{ filteredCount }}</strong> de {{ totalCount }} questões
      </div>
    </div>

    <!-- BADGES DOS FILTROS APLICADOS COM REMOÇÃO INDIVIDUAL -->
    <div v-if="hasFilters" class="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1">
      <span class="text-xs text-[var(--admin-text-muted,#77727f)] font-semibold">Filtros ativos:</span>

      <span
        v-if="filters?.search"
        class="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"
      >
        Busca: "{{ filters.search }}"
        <button type="button" @click="removeFilter('search')" class="hover:text-purple-900">✕</button>
      </span>

      <span
        v-if="filters?.subjectId"
        class="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"
      >
        {{ getSubjectName(filters.subjectId) }}
        <button type="button" @click="removeFilter('subjectId')" class="hover:text-purple-900">✕</button>
      </span>

      <span
        v-if="filters?.year"
        class="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
      >
        ENEM {{ filters.year }}
        <button type="button" @click="removeFilter('year')" class="hover:text-blue-900">✕</button>
      </span>

      <span
        v-if="filters?.difficulty"
        class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
      >
        {{ filters.difficulty === 'EASY' ? 'Fácil' : filters.difficulty === 'MEDIUM' ? 'Média' : 'Difícil' }}
        <button type="button" @click="removeFilter('difficulty')" class="hover:text-amber-900">✕</button>
      </span>

      <span
        v-if="filters?.status"
        class="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
      >
        {{ filters.status === 'ACTIVE' ? 'Ativa' : 'Inativa' }}
        <button type="button" @click="removeFilter('status')" class="hover:text-zinc-900">✕</button>
      </span>

      <span
        v-if="filters?.hasImages"
        class="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300"
      >
        {{ filters.hasImages === 'true' ? 'Com Imagens' : 'Sem Imagens' }}
        <button type="button" @click="removeFilter('hasImages')" class="hover:text-sky-900">✕</button>
      </span>

      <span
        v-if="filters?.hasExplanation"
        class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
      >
        {{ filters.hasExplanation === 'true' ? 'Com Resolução' : 'Sem Resolução' }}
        <button type="button" @click="removeFilter('hasExplanation')" class="hover:text-emerald-900">✕</button>
      </span>
    </div>
  </section>
</template>
