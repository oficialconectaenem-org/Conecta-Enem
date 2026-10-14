<script setup>
import SubjectForm from '~/components/admin/SubjectForm.vue'
import { useSubjects } from '~/composables/useSubjects'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Nova matéria — Conecta Enem'
})

const {
  createSubject
} = useSubjects()

const saving = ref(false)
const error = ref('')

async function handleSubmit(payload) {
  if (saving.value) {
    return
  }

  saving.value = true
  error.value = ''

  try {
    await createSubject(payload)

    await navigateTo('/admin/materias')
  }
  catch (err) {
    console.error(
      'Erro ao criar matéria:',
      err
    )

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível cadastrar a matéria.'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <NuxtLink
      to="/admin/materias"
      class="inline-flex text-sm font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"
    >
      ← Voltar para matérias
    </NuxtLink>

    <div>
      <p
        class="text-sm font-bold text-[#7C3AED]"
      >
        Conteúdo
      </p>

      <h1
        class="mt-1 text-3xl font-black text-zinc-900"
      >
        Nova matéria
      </h1>

      <p
        class="mt-2 text-sm text-zinc-500"
      >
        Cadastre uma nova matéria na plataforma.
      </p>
    </div>

    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
    >
      {{ error }}
    </div>

    <SubjectForm
      :loading="saving"
      @submit="handleSubmit"
    />

  </div>
</template>