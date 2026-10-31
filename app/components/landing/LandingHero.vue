<script setup>
import { usePwaInstall } from '~/composables/usePwaInstall'

const { isInstalled, isIos, promptInstall } = usePwaInstall()
const showInstallModal = ref(false)

async function handleInstallHero() {
  const result = await promptInstall()
  if (!result) {
    showInstallModal.value = true
  }
}
</script>

<template>
  <section class="relative isolate overflow-hidden bg-gradient-to-br from-[#faf8ff] via-white to-[#fdf4ff] dark:from-[#09090b] dark:via-[#12091f] dark:to-[#09090b] transition-colors duration-200">
    <div class="landing-orb landing-orb--one" />
    <div class="landing-orb landing-orb--two" />
    <div class="landing-grid absolute inset-0 -z-10 opacity-40 dark:opacity-20" />

    <div class="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pb-24">
      <div class="max-w-2xl">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-white/80 px-4 py-2 text-xs sm:text-sm font-bold text-purple-700 shadow-xs backdrop-blur-md dark:border-purple-500/30 dark:bg-zinc-900/80 dark:text-purple-300">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Plataforma 100% Gratuita & Aberta para o ENEM
        </div>

        <h1 class="text-4xl font-black leading-[1.08] tracking-[-0.04em] text-zinc-950 sm:text-5xl lg:text-[4.25rem] dark:text-white">
          O seu plano de estudos para alcançar a
          <span class="block bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-300 dark:to-fuchsia-300">Nota 1000 no ENEM.</span>
        </h1>

        <p class="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          Aulas dinâmicas, banco de questões oficiais comentadas, simulações reais e correção inteligente de redação para transformar sua jornada rumo à faculdade.
        </p>

        <div class="mt-8 flex flex-col gap-3.5 sm:flex-row">
          <NuxtLink to="/cadastro" class="landing-primary-button shadow-lg shadow-purple-600/25">
            Começar Gratuitamente <span class="material-symbols-rounded text-lg">arrow_forward</span>
          </NuxtLink>
          <button
            type="button"
            @click="handleInstallHero"
            class="landing-secondary-button cursor-pointer flex items-center justify-center gap-2"
          >
            <span class="material-symbols-rounded text-xl text-purple-600 dark:text-purple-400">download</span>
            <span>Baixar App</span>
          </button>
        </div>

        <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          <span class="flex items-center gap-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">✓</span>
            100% Gratuito
          </span>
          <span class="flex items-center gap-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">✓</span>
            Sem Assinaturas ou Mensalidades
          </span>
          <span class="flex items-center gap-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-400">✓</span>
            Focado no ENEM & SISU
          </span>
        </div>
      </div>

      <!-- MOCKUP DO SISTEMA INTERATIVO -->
      <div class="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:justify-self-end">
        <!-- Glow traseiro -->
        <div class="absolute -inset-1.5 rounded-[2.5rem] bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-20 blur-xl dark:opacity-35"></div>

        <div class="relative rounded-[2rem] border border-white/90 bg-white/90 p-6 sm:p-8 shadow-2xl shadow-purple-950/10 backdrop-blur-xl space-y-5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-black/50">
          <div class="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold p-1 dark:bg-zinc-800 dark:text-purple-400">
                <img src="/images/logo conta.png" alt="Logo" class="h-full w-full object-contain" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Painel do Aluno</p>
                <p class="text-sm font-black text-zinc-900 dark:text-zinc-100">Evolução de Estudos</p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Ativo
            </span>
          </div>

          <div class="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/50 p-4.5 border border-purple-100/60 dark:from-zinc-800/80 dark:to-purple-950/30 dark:border-zinc-700">
            <div class="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <span>Meta Semanal de Redação</span>
              <span class="text-purple-700 font-black dark:text-purple-300">920 / 1000 pts</span>
            </div>
            <div class="mt-2.5 h-3 overflow-hidden rounded-full bg-purple-200/60 p-0.5 dark:bg-zinc-700">
              <div class="h-full w-[92%] rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-emerald-500 transition-all duration-1000" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            <div class="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
              <span class="material-symbols-rounded text-purple-600 text-xl dark:text-purple-400">quiz</span>
              <p class="text-2xl font-black text-zinc-900 mt-1 dark:text-white">128</p>
              <p class="text-[11px] font-medium text-zinc-400">questões resolvidas</p>
            </div>
            <div class="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
              <span class="material-symbols-rounded text-emerald-600 text-xl dark:text-emerald-400">timer</span>
              <p class="text-2xl font-black text-zinc-900 mt-1 dark:text-white">18h</p>
              <p class="text-[11px] font-medium text-zinc-400">estudo acumulado</p>
            </div>
          </div>

          <div class="flex items-center justify-between rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white shadow-lg shadow-purple-600/20">
            <div class="space-y-0.5">
              <p class="text-[10px] font-bold uppercase tracking-wider text-purple-200">Próxima Atividade</p>
              <p class="text-xs sm:text-sm font-extrabold text-white">Laboratório: Repertórios de Filosofia</p>
            </div>
            <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-sm">
              <span class="material-symbols-rounded text-base">play_arrow</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE INSTRUÇÕES DE INSTALAÇÃO DO APP -->
    <Teleport to="body">
      <div
        v-if="showInstallModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
        @click.self="showInstallModal = false"
      >
        <div class="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl border border-purple-100 dark:border-zinc-800 space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-zinc-800 p-1">
                <img src="/images/icone mobile.png" alt="App Icon" class="h-full w-full object-contain" />
              </div>
              <div>
                <h3 class="text-sm font-black text-zinc-900 dark:text-white">Instalar Conecta Enem</h3>
                <p class="text-[11px] text-purple-600 dark:text-purple-400 font-bold">App Oficial no seu celular ou PC</p>
              </div>
            </div>
            <button
              type="button"
              @click="showInstallModal = false"
              class="h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 flex items-center justify-center transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p v-if="isIos">
              No seu <strong>iPhone/iPad (Safari)</strong>:
            </p>
            <ol v-if="isIos" class="list-decimal pl-4 space-y-1.5 font-medium">
              <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com seta para cima na barra inferior).</li>
              <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
            </ol>

            <p v-else>
              Para adicionar o aplicativo à sua tela inicial:
            </p>
            <ol v-if="!isIos" class="list-decimal pl-4 space-y-1.5 font-medium">
              <li>No menu do seu navegador (três pontinhos no topo ou barra de endereços).</li>
              <li>Clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
              <li>Pronto! O app será instalado e você permanecerá logado diretamente nele.</li>
            </ol>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              @click="showInstallModal = false"
              class="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
