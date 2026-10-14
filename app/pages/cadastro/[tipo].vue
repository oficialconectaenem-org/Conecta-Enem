<script setup>
import AuthPanel from '~/components/auth/AuthPanel.vue'
import RegisterForm from '~/components/auth/RegisterForm.vue'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()

const tipo = String(
  route.params.tipo || ''
).toLowerCase()

if (tipo !== 'professor') {
  throw createError({
    statusCode: 404,
    statusMessage: 'Página não encontrada'
  })
}

useSeoMeta({
  title: 'Cadastro de Professor — Conecta Enem',
  description:
    'Cadastro de professor de redação do Conecta Enem.'
})
</script>

<template>
  <AuthPanel
    title="Ajude estudantes a evoluírem através da redação."
    description="Corrija redações, envie feedbacks e acompanhe a evolução dos estudantes vinculados a você."
    footer-text="Área destinada a professores de redação."
  >
    <RegisterForm account-type="TEACHER" />
  </AuthPanel>
</template>