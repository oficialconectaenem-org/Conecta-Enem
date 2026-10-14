<script setup>
import { useSubjects } from '~/composables/useSubjects'
import { useModules } from '~/composables/useModules'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Editar módulo — Conecta Enem'
})

const route = useRoute()

const {
  getSubject
} = useSubjects()

const {
  getModule,
  updateModule
} = useModules()

const subject = ref(null)
const moduleData = ref(null)

const loading = ref(true)
const saving = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  description: '',
  order: 1,
  active: true
})

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const [
      subjectResponse,
      moduleResponse
    ] = await Promise.all([
      getSubject(route.params.id),
      getModule(route.params.moduleId)
    ])

    subject.value =
      subjectResponse.subject

    moduleData.value =
      moduleResponse.module

    form.name =
      moduleData.value.name || ''

    form.description =
      moduleData.value.description || ''

    form.order =
      moduleData.value.order ?? 1

    form.active =
      moduleData.value.active ?? true
  }
  catch (err) {
    console.error(
      'Erro ao carregar módulo:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível carregar o módulo.'
  }
  finally {
    loading.value = false
  }
}

async function saveModule() {
  if (saving.value) {
    return
  }

  if (!form.name.trim()) {
    error.value =
      'Informe o nome do módulo.'

    return
  }

  saving.value = true
  error.value = ''

  try {
    await updateModule(
      route.params.moduleId,
      {
        subjectId:
          route.params.id,

        name:
          form.name.trim(),

        description:
          form.description.trim() || null,

        order:
          Number(form.order) || 1,

        active:
          form.active
      }
    )

    await navigateTo(
      `/admin/materias/${route.params.id}/modulos/${route.params.moduleId}`
    )
  }
  catch (err) {
    console.error(
      'Erro ao editar módulo:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível salvar as alterações.'
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">

    <NuxtLink
      :to="`/admin/materias/${route.params.id}/modulos/${route.params.moduleId}`"
      class="inline-flex text-sm font-bold text-[#7C3AED]"
    >
      ← Voltar para o módulo
    </NuxtLink>

    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="rounded-2xl border border-zinc-200 bg-white p-10 text-center"
    >
      Carregando módulo...
    </div>

    <template v-else>

      <div>
        <p
          class="text-sm font-bold text-[#7C3AED]"
        >
          {{ subject?.name }}
        </p>

        <h1
          class="mt-1 text-3xl font-black text-zinc-900"
        >
          Editar módulo
        </h1>

        <p
          class="mt-2 text-sm text-zinc-500"
        >
          Altere as informações e a ordem do módulo.
        </p>
      </div>

      <form
        class="max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        @submit.prevent="saveModule"
      >

        <!-- NOME -->
        <div>
          <label
            for="module-name"
            class="block text-sm font-bold text-zinc-700"
          >
            Nome do módulo
          </label>

          <input
            id="module-name"
            v-model="form.name"
            type="text"
            required
            class="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#7C3AED]"
          >
        </div>

        <!-- DESCRIÇÃO -->
        <div>
          <label
            for="module-description"
            class="block text-sm font-bold text-zinc-700"
          >
            Descrição
          </label>

          <textarea
            id="module-description"
            v-model="form.description"
            rows="4"
            class="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#7C3AED]"
          />
        </div>

        <!-- ORDEM -->
        <div>
          <label
            for="module-order"
            class="block text-sm font-bold text-zinc-700"
          >
            Ordem
          </label>

          <input
            id="module-order"
            v-model.number="form.order"
            type="number"
            min="1"
            class="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#7C3AED]"
          >
        </div>

        <!-- STATUS -->
        <label
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4"
        >
          <input
            v-model="form.active"
            type="checkbox"
          >

          <div>
            <p
              class="font-bold text-zinc-900"
            >
              Módulo ativo
            </p>

            <p
              class="text-xs text-zinc-500"
            >
              Desmarque para deixar este módulo inativo.
            </p>
          </div>
        </label>

        <!-- BOTÕES -->
        <div
          class="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end"
        >

          <NuxtLink
            :to="`/admin/materias/${route.params.id}/modulos/${route.params.moduleId}`"
            class="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-600"
          >
            Cancelar
          </NuxtLink>

          <button
            type="submit"
            :disabled="saving"
            class="rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#5B21B6] disabled:opacity-50"
          >
            {{
              saving
                ? 'Salvando...'
                : 'Salvar alterações'
            }}
          </button>

        </div>

      </form>

    </template>

  </div>
</template>