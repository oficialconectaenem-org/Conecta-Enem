<script setup>
import RedacaoManager from '~/components/admin/redacao/RedacaoManager.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Laboratório de Redação — Administração | Conecta Enem'
})
</script>

<template>
  <div>
    <RedacaoManager />
  </div>
</template>
