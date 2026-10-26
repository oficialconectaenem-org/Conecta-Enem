<script setup>
const props = defineProps({
  module: {
    type: Object,
    default: null
  },

  subjects: {
    type: Array,
    default: () => []
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
  subjectId: '',
  name: '',
  description: '',
  order: 0,
  active: true
})

watch(
  () => props.module,
  (module) => {
    if (!module) {
      return
    }

    form.subjectId =
      module.subjectId || ''

    form.name =
      module.name || ''

    form.description =
      module.description || ''

    form.order =
      module.order ?? 0

    form.active =
      module.active ?? true
  },
  {
    immediate: true
  }
)

function handleSubmit() {
  emit('submit', {
    subjectId:
      form.subjectId,

    name:
      form.name,

    description:
      form.description,

    order:
      Number(form.order),

    active:
      form.active
  })
}
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="handleSubmit"
  >
    <div
      class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
    >
      <div class="space-y-5">
        <!-- Matéria -->
        <div>
          <label
            for="subjectId"
            class="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200"
          >
            Matéria
          </label>

          <select
            id="subjectId"
            v-model="form.subjectId"
            required
            class="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30"
          >
            <option value="">
              Selecione uma matéria
            </option>

            <option
              v-for="subject in subjects"
              :key="subject.id"
              :value="subject.id"
            >
              {{ subject.name }}
            </option>
          </select>

          <p
            v-if="subjects.length === 0"
            class="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            Nenhuma matéria cadastrada.
            Cadastre uma matéria antes de criar módulos.
          </p>
        </div>

        <!-- Nome -->
        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200"
          >
            Nome do módulo
          </label>

          <input
            id="name"
            v-model="form.name"
            type="text"
            maxlength="120"
            required
            placeholder="Ex.: Álgebra"
            class="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30"
          >
        </div>

        <!-- Descrição -->
        <div>
          <label
            for="description"
            class="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200"
          >
            Descrição
          </label>

          <textarea
            id="description"
            v-model="form.description"
            rows="4"
            maxlength="500"
            placeholder="Descreva brevemente o conteúdo deste módulo."
            class="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30"
          />
        </div>

        <div
          class="grid gap-5 sm:grid-cols-2"
        >
          <!-- Ordem -->
          <div>
            <label
              for="order"
              class="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200"
            >
              Ordem
            </label>

            <input
              id="order"
              v-model.number="form.order"
              type="number"
              min="0"
              required
              class="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30"
            >
          </div>

          <!-- Status -->
          <div>
            <p
              class="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200"
            >
              Status
            </p>

            <label
              class="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4"
            >
              <input
                v-model="form.active"
                type="checkbox"
                class="h-4 w-4 accent-[#7C3AED]"
              >

              <span
                class="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Módulo ativo
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
    >
      <NuxtLink
        to="/admin/modulos"
        class="inline-flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Cancelar
      </NuxtLink>

      <button
        type="submit"
        :disabled="
          loading ||
          !form.subjectId ||
          subjects.length === 0
        "
        class="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{
          loading
            ? 'Salvando...'
            : 'Salvar módulo'
        }}
      </button>
    </div>
  </form>
</template>