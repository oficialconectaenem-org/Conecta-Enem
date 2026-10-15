<script setup>
const props = defineProps({
  question: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'view',
  'edit',
  'delete'
])

const difficulty = computed(() => {
  const value = String(
    props.question?.difficulty ||
    props.question?.level ||
    ''
  ).toUpperCase()

  const map = {
    EASY: {
      label: 'Fácil',
      class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    MEDIUM: {
      label: 'Média',
      class: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    HARD: {
      label: 'Difícil',
      class: 'bg-red-50 text-red-700 border-red-200'
    }
  }

  return (
    map[value] || {
      label: 'Média',
      class: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  )
})

const status = computed(() => {
  if (props.question?.active === true || props.question?.status === 'ACTIVE') {
    return {
      label: 'Ativa',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }
  }

  if (props.question?.active === false || props.question?.status === 'INACTIVE') {
    return {
      label: 'Inativa',
      class: 'bg-zinc-100 text-zinc-600 border border-zinc-200'
    }
  }

  return {
    label: 'Ativa',
    class: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  }
})

const statement = computed(() => {
  return (
    props.question?.statement ||
    props.question?.question ||
    props.question?.content ||
    'Questão sem enunciado.'
  )
})

const subjectName = computed(() => {
  return (
    props.question?.subject?.name ||
    props.question?.subject?.title ||
    props.question?.subjectName ||
    'Sem matéria'
  )
})

const alternativesCount = computed(() => {
  if (Array.isArray(props.question?.options)) {
    return props.question.options.length
  }
  if (Array.isArray(props.question?.alternatives)) {
    return props.question.alternatives.length
  }
  return 0
})

const imagesCount = computed(() => {
  if (props.question?.images) {
    try {
      const parsed = typeof props.question.images === 'string' ? JSON.parse(props.question.images) : props.question.images
      if (Array.isArray(parsed)) return parsed.filter(Boolean).length
    } catch {}
  }
  return props.question?.imageUrl ? 1 : 0
})
</script>

<template>
  <article
    class="group flex min-h-[290px] flex-col rounded-2xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-card,#ffffff)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--admin-primary,#6d28d9)]/40 hover:shadow-[0_12px_35px_rgba(0,0,0,0.06)]"
  >
    <!-- TOP -->
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <span
          class="rounded-lg bg-[var(--admin-primary-soft,#f3e8ff)] px-2.5 py-1 text-[11px] font-bold text-[var(--admin-primary,#6d28d9)]"
        >
          {{ subjectName }}
        </span>

        <span
          class="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
          :class="difficulty.class"
        >
          {{ difficulty.label }}
        </span>

        <span
          v-if="imagesCount > 0"
          class="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-700"
        >
          <span class="material-symbols-rounded text-[13px]">image</span>
          {{ imagesCount }} {{ imagesCount === 1 ? 'img' : 'imgs' }}
        </span>
      </div>

      <span
        class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
        :class="status.class"
      >
        {{ status.label }}
      </span>
    </div>

    <!-- TITLE (Optional) -->
    <h3
      v-if="question.title"
      class="mb-1 text-sm font-bold text-[var(--admin-text,#17151d)]"
    >
      {{ question.title }}
    </h3>

    <!-- STATEMENT -->
    <button
      type="button"
      class="line-clamp-4 text-left text-sm font-medium leading-6 text-zinc-700 transition hover:text-[var(--admin-primary,#6d28d9)]"
      @click="emit('view')"
    >
      {{ statement }}
    </button>

    <!-- INFO -->
    <div
      class="mt-auto flex items-center justify-between border-t border-[var(--admin-border,#e9e7ee)] pt-4"
    >
      <div class="flex items-center gap-3 text-xs text-[var(--admin-text-muted,#77727f)]">
        <div
          v-if="alternativesCount"
          class="flex items-center gap-1"
        >
          <span class="material-symbols-rounded text-[16px]">
            list_alt
          </span>
          <span>{{ alternativesCount }} opções</span>
        </div>

        <div
          v-if="question.year"
          class="flex items-center gap-1"
        >
          <span class="material-symbols-rounded text-[16px]">
            calendar_today
          </span>
          <span>ENEM {{ question.year }}</span>
        </div>
      </div>

      <div
        v-if="question.correctAnswer"
        class="flex items-center gap-1 text-xs font-bold text-emerald-700"
      >
        <span>Gabarito:</span>
        <span class="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-extrabold text-emerald-800">
          {{ question.correctAnswer }}
        </span>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--admin-border,#e9e7ee)] text-xs font-semibold text-[var(--admin-text-muted,#77727f)] transition hover:border-[var(--admin-primary,#6d28d9)] hover:text-[var(--admin-primary,#6d28d9)]"
        @click="emit('view')"
      >
        <span class="material-symbols-rounded text-[17px]">
          visibility
        </span>
        Ver
      </button>

      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--admin-border,#e9e7ee)] text-xs font-semibold text-[var(--admin-text-muted,#77727f)] transition hover:border-[var(--admin-primary,#6d28d9)] hover:text-[var(--admin-primary,#6d28d9)]"
        @click="emit('edit')"
      >
        <span class="material-symbols-rounded text-[17px]">
          edit
        </span>
        Editar
      </button>

      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        @click="emit('delete')"
      >
        <span class="material-symbols-rounded text-[17px]">
          delete
        </span>
        Excluir
      </button>
    </div>
  </article>
</template>