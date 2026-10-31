<script setup>
import ApiKeyManager from '~/components/admin/apikeys/ApiKeyManager.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Chaves de API — Painel Administrativo'
})
</script>

<template>
  <ApiKeyManager />
</template>

