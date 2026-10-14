<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
    <!-- Barra Superior de Navegação Rápida com Logo / Voltar -->
    <header class="w-full z-40 px-5 pt-4 sm:pt-6">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-purple-600 bg-white/80 border border-slate-200/80 backdrop-blur-md shadow-2xs hover:shadow-xs transition"
        >
          <span class="material-symbols-rounded text-base">arrow_back</span>
          <span>Voltar ao início</span>
        </NuxtLink>

      </div>
    </header>

    <div class="flex-1 flex flex-col justify-center">
      <slot />
    </div>
  </div>
</template>