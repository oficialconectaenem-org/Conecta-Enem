<script setup>
import UserManager from '~/components/admin/users/UserManager.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Usuários — Conecta Enem'
})
</script>

<template>
  <UserManager />
</template>
