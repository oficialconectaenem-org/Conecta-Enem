<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  footerText: {
    type: String,
    default: 'Preparação gratuita para o ENEM.'
  }
})

const mascoteSrc = '/images/mascote-conectar-enem.png.png'
</script>

<template>
  <main
    class="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-4 sm:py-6 lg:py-8"
  >
    <!-- Fundo -->
    <div
      class="absolute -left-40 top-20 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none"
    />

    <div
      class="absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-3xl pointer-events-none"
    />

    <!-- Card principal -->
    <div
      class="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-zinc-800/80 bg-white dark:bg-[#121215] shadow-2xl shadow-purple-900/10 dark:shadow-purple-950/40 lg:grid-cols-[1fr_1.05fr] transition-colors duration-200"
    >
      <!-- LADO ESQUERDO -->
      <section
        class="relative hidden min-h-[700px] overflow-hidden bg-gradient-to-br from-purple-800 via-purple-900 to-indigo-950 dark:from-purple-950 dark:via-purple-900 dark:to-indigo-950 p-10 text-white lg:flex lg:flex-col lg:justify-between border-r border-purple-200/30 dark:border-zinc-800/50"
      >
        <div
          class="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-purple-500/20 blur-2xl pointer-events-none"
        />


        <!-- Mascote e texto -->
        <div class="relative z-10">
          <img
            :src="mascoteSrc"
            alt="Mascote do Conecta Enem"
            width="360"
            height="360"
            class="mx-auto w-full max-w-[320px] object-contain drop-shadow-xl"
          >

          <h2
            class="mt-5 text-3xl font-black leading-tight text-white"
          >
            {{ title }}
          </h2>

          <p
            class="mt-4 max-w-md leading-7 text-purple-200/90"
          >
            {{ description }}
          </p>
        </div>

        <p
          class="relative z-10 text-sm text-purple-300/70"
        >
          {{ footerText }}
        </p>
      </section>

      <!-- LADO DIREITO -->
      <section
        class="flex min-h-[700px] items-center bg-white dark:bg-[#18181b] p-6 sm:p-10 lg:p-12 transition-colors duration-200"
      >
        <div class="mx-auto w-full max-w-md">

          <img
            :src="mascoteSrc"
            alt="Mascote do Conecta Enem"
            width="160"
            height="160"
            class="mx-auto mb-6 w-32 object-contain sm:w-36 lg:hidden"
          >

          <!-- Aqui entra SOMENTE o formulário -->
          <slot />
        </div>
      </section>
    </div>
  </main>
</template>
