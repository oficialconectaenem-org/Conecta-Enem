<script setup>
import AuthPanel from '~/components/auth/AuthPanel.vue'
import RegisterForm from '~/components/auth/RegisterForm.vue'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Criar conta — Conecta Enem',
  description:
    'Crie gratuitamente sua conta de aluno no Conecta Enem.'
})
</script>

<template>
  <AuthPanel
    title="Seu futuro começa com o próximo passo."
    description="Organize seus estudos, pratique questões, faça simulados, desenvolva sua redação e acompanhe sua evolução."
    footer-text="Gratuito. Sem assinatura e sem cobrança."
  >
    <RegisterForm account-type="STUDENT" />
  </AuthPanel>
</template>