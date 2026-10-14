<script setup>
import { useSubjects } from '~/composables/useSubjects'
import { useModules } from '~/composables/useModules'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Visualizar módulo — Conecta Enem'
})

const route = useRoute()

const {
  getSubject
} = useSubjects()

const {
  getModule,
  updateModule,
  deleteModule
} = useModules()

const subject = ref(null)
const moduleData = ref(null)

const loading = ref(true)
const updating = ref(false)
const deleting = ref(false)
const error = ref('')

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

async function toggleModule() {
  if (
    !moduleData.value ||
    updating.value
  ) {
    return
  }

  updating.value = true
  error.value = ''

  try {
    const response = await updateModule(
      moduleData.value.id,
      {
        subjectId:
          moduleData.value.subjectId,

        name:
          moduleData.value.name,

        description:
          moduleData.value.description,

        order:
          moduleData.value.order,

        active:
          !moduleData.value.active
      }
    )

    moduleData.value =
      response.module
  }
  catch (err) {
    console.error(
      'Erro ao alterar status:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível alterar o status.'
  }
  finally {
    updating.value = false
  }
}

async function removeModule() {
  if (!moduleData.value) {
    return
  }

  const confirmed =
    window.confirm(
      `Deseja realmente excluir o módulo "${moduleData.value.name}"?`
    )

  if (!confirmed) {
    return
  }

  deleting.value = true
  error.value = ''

  try {
    await deleteModule(
      moduleData.value.id
    )

    await navigateTo(
      `/admin/materias/${route.params.id}`
    )
  }
  catch (err) {
    console.error(
      'Erro ao excluir módulo:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível excluir o módulo.'
  }
  finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="space-y-6">

    <NuxtLink
      :to="`/admin/materias/${route.params.id}`"
      class="inline-flex text-sm font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
    >
      ← Voltar para {{ subject?.name || 'matéria' }}
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
      <p class="font-semibold text-zinc-500">
        Carregando módulo...
      </p>
    </div>

    <template v-else-if="moduleData">

      <!-- MÓDULO -->
      <section
        class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
        >

          <div>
            <p
              class="text-sm font-bold text-[#7C3AED]"
            >
              {{ subject?.name }}
            </p>

            <h1
              class="mt-1 text-3xl font-black text-zinc-900"
            >
              {{ moduleData.name }}
            </h1>

            <p
              class="mt-3 max-w-2xl text-sm text-zinc-500"
            >
              {{
                moduleData.description ||
                'Sem descrição'
              }}
            </p>

            <div
              class="mt-5 flex flex-wrap gap-2"
            >

              <span
                class="rounded-full px-3 py-1 text-xs font-bold"
                :class="
                  moduleData.active
                    ? 'bg-green-50 text-green-700'
                    : 'bg-zinc-100 text-zinc-500'
                "
              >
                {{
                  moduleData.active
                    ? 'Ativo'
                    : 'Inativo'
                }}
              </span>

              <span
                class="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[#7C3AED]"
              >
                Ordem {{ moduleData.order }}
              </span>

            </div>
          </div>

          <!-- AÇÕES -->
          <div
            class="flex flex-wrap gap-2"
          >

            <NuxtLink
              :to="`/admin/materias/${route.params.id}/modulos/${route.params.moduleId}/editar`"
              class="rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#5B21B6]"
            >
              Editar
            </NuxtLink>

            <button
              type="button"
              :disabled="updating"
              class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              @click="toggleModule"
            >
              {{
                updating
                  ? 'Salvando...'
                  : moduleData.active
                    ? 'Desativar'
                    : 'Ativar'
              }}
            </button>

            <button
              type="button"
              :disabled="deleting"
              class="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              @click="removeModule"
            >
              {{
                deleting
                  ? 'Excluindo...'
                  : 'Excluir'
              }}
            </button>

          </div>
        </div>
      </section>

      <!-- CONTEÚDOS -->
      <section>
        <h2
          class="text-xl font-black text-zinc-900"
        >
          Conteúdos do módulo
        </h2>

        <p
          class="mt-1 text-sm text-zinc-500"
        >
          Depois vamos conectar cada área ao seu painel próprio.
        </p>

        <div
          class="mt-5 grid gap-4 md:grid-cols-3"
        >

          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6"
          >
            <div class="text-2xl">
              🎥
            </div>

            <h3
              class="mt-3 font-black text-zinc-900"
            >
              Aulas
            </h3>

            <p
              class="mt-2 text-sm text-zinc-500"
            >
              Aulas vinculadas a este módulo.
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6"
          >
            <div class="text-2xl">
              📄
            </div>

            <h3
              class="mt-3 font-black text-zinc-900"
            >
              PDFs
            </h3>

            <p
              class="mt-2 text-sm text-zinc-500"
            >
              Materiais em PDF deste módulo.
            </p>
          </div>

          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6"
          >
            <div class="text-2xl">
              ❓
            </div>

            <h3
              class="mt-3 font-black text-zinc-900"
            >
              Questões
            </h3>

            <p
              class="mt-2 text-sm text-zinc-500"
            >
              Questões relacionadas ao módulo.
            </p>
          </div>

        </div>
      </section>

    </template>

  </div>
</template>