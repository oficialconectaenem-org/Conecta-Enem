<script setup>
import { useSubjects } from '~/composables/useSubjects'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Matérias — Conecta Enem'
})

const {
  getSubjects,
  updateSubject
} = useSubjects()

const subjects = ref([])
const loading = ref(true)
const error = ref('')
const updatingId = ref(null)

async function loadSubjects() {
  loading.value = true
  error.value = ''

  try {
    const response = await getSubjects()

    subjects.value =
      response.subjects || []
  }
  catch (err) {
    console.error(
      'Erro ao carregar matérias:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível carregar as matérias.'
  }
  finally {
    loading.value = false
  }
}

async function toggleSubject(subject) {
  if (updatingId.value) {
    return
  }

  updatingId.value = subject.id
  error.value = ''

  try {
    const response = await updateSubject(
      subject.id,
      {
        name: subject.name,
        description: subject.description,
        order: subject.order,
        active: !subject.active
      }
    )

    const index =
      subjects.value.findIndex(
        item => item.id === subject.id
      )

    if (index !== -1) {
      subjects.value[index] =
        response.subject
    }
  }
  catch (err) {
    console.error(
      'Erro ao alterar matéria:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível alterar a matéria.'
  }
  finally {
    updatingId.value = null
  }
}

onMounted(() => {
  loadSubjects()
})
</script>

<template>
  <div class="space-y-6">

    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-sm font-bold text-[#7C3AED]"
        >
          Conteúdo
        </p>

        <h1
          class="mt-1 text-3xl font-black text-zinc-900"
        >
          Matérias
        </h1>

        <p
          class="mt-2 text-sm text-zinc-500"
        >
          Cadastre e gerencie as matérias da plataforma.
        </p>
      </div>

      <NuxtLink
        to="/admin/materias/nova"
        class="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#5B21B6]"
      >
        + Nova matéria
      </NuxtLink>
    </div>

    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="rounded-2xl border border-zinc-200 bg-white p-10 text-center"
    >
      Carregando matérias...
    </div>

    <div
      v-else-if="subjects.length === 0"
      class="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center"
    >
      <div class="text-3xl">
        📚
      </div>

      <h2
        class="mt-4 font-black text-zinc-900"
      >
        Nenhuma matéria cadastrada
      </h2>

      <NuxtLink
        to="/admin/materias/nova"
        class="mt-5 inline-flex rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white"
      >
        Cadastrar matéria
      </NuxtLink>
    </div>

    <div
      v-else
      class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <div class="overflow-x-auto">

        <table
          class="min-w-full divide-y divide-zinc-200"
        >
          <thead class="bg-zinc-50">
            <tr>
              <th
                class="px-5 py-3 text-left text-xs font-black uppercase text-zinc-400"
              >
                Ordem
              </th>

              <th
                class="px-5 py-3 text-left text-xs font-black uppercase text-zinc-400"
              >
                Matéria
              </th>

              <th
                class="px-5 py-3 text-left text-xs font-black uppercase text-zinc-400"
              >
                Status
              </th>

              <th
                class="px-5 py-3 text-right text-xs font-black uppercase text-zinc-400"
              >
                Ações
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-zinc-100">

            <tr
              v-for="subject in subjects"
              :key="subject.id"
              class="hover:bg-zinc-50"
            >
              <td
                class="px-5 py-4 text-sm font-semibold text-zinc-500"
              >
                {{ subject.order }}
              </td>

              <td class="px-5 py-4">
                <p
                  class="font-bold text-zinc-900"
                >
                  {{ subject.name }}
                </p>

                <p
                  class="mt-1 text-sm text-zinc-400"
                >
                  {{
                    subject.description ||
                    'Sem descrição'
                  }}
                </p>
              </td>

              <td class="px-5 py-4">
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold"
                  :class="
                    subject.active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-zinc-100 text-zinc-500'
                  "
                >
                  {{
                    subject.active
                      ? 'Ativa'
                      : 'Inativa'
                  }}
                </span>
              </td>

              <td class="px-5 py-4">

                <div
                  class="flex justify-end gap-2"
                >
                  <NuxtLink
                    :to="`/admin/materias/${subject.id}`"
                    class="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5B21B6]"
                  >
                    Editar
                  </NuxtLink>

                  <button
                    type="button"
                    :disabled="
                      updatingId === subject.id
                    "
                    class="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                    @click="
                      toggleSubject(subject)
                    "
                  >
                    {{
                      updatingId === subject.id
                        ? 'Salvando...'
                        : subject.active
                          ? 'Desativar'
                          : 'Ativar'
                    }}
                  </button>
                </div>

              </td>
            </tr>

          </tbody>
        </table>

      </div>
    </div>

  </div>
</template>