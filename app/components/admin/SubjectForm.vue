<script setup>
const props = defineProps({
  subject: {
    type: Object,
    default: null
  },

  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'submit'
])

const form = reactive({
  name: '',
  description: '',
  order: 0,
  active: true
})

watch(
  () => props.subject,
  (subject) => {
    if (!subject) {
      return
    }

    form.name =
      subject.name || ''

    form.description =
      subject.description || ''

    form.order =
      subject.order ?? 0

    form.active =
      subject.active ?? true
  },
  {
    immediate: true
  }
)

function handleSubmit() {
  emit('submit', {
    name: form.name,
    description: form.description,
    order: Number(form.order),
    active: form.active
  })
}
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="handleSubmit"
  >
    <div class="space-y-2">
      <label
        for="subject-name"
        class="text-sm font-bold text-zinc-700 dark:text-zinc-200"
      >
        Nome da matéria
      </label>

      <input
        id="subject-name"
        v-model="form.name"
        type="text"
        required
        maxlength="100"
        placeholder="Ex.: Matemática"
        class="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 py-3 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30"
      >
    </div>

    <div class="space-y-2">
      <label
        for="subject-description"
        class="text-sm font-bold text-zinc-700 dark:text-zinc-200"
      >
        Descrição
      </label>

      <textarea
        id="subject-description"
        v-model="form.description"
        rows="4"
        maxlength="500"
        placeholder="Breve descrição da matéria..."
        class="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 py-3 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30"
      />
    </div>

    <div
      class="grid gap-5 sm:grid-cols-2"
    >
      <div class="space-y-2">
        <label
          for="subject-order"
          class="text-sm font-bold text-zinc-700 dark:text-zinc-200"
        >
          Ordem
        </label>

        <input
          id="subject-order"
          v-model.number="form.order"
          type="number"
          min="0"
          class="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 py-3 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30"
        >
      </div>

      <div class="space-y-2">
        <p
          class="text-sm font-bold text-zinc-700 dark:text-zinc-200"
        >
          Status
        </p>

        <label
          class="flex min-h-[50px] cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4"
        >
          <input
            v-model="form.active"
            type="checkbox"
            class="h-4 w-4 accent-purple-600"
          >

          <span
            class="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Matéria ativa
          </span>
        </label>
      </div>
    </div>

    <div
      class="flex flex-col-reverse gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-6 sm:flex-row sm:justify-end"
    >
      <NuxtLink
        to="/admin/materias"
        class="rounded-xl border border-zinc-200 dark:border-zinc-700 px-5 py-3 text-center text-sm font-bold text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Cancelar
      </NuxtLink>

      <button
        type="submit"
        :disabled="loading"
        class="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{
          loading
            ? 'Salvando...'
            : subject
              ? 'Salvar alterações'
              : 'Cadastrar matéria'
        }}
      </button>
    </div>
  </form>
</template>