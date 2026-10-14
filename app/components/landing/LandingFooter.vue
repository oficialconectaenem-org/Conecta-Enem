<template>
  <footer
    id="sobre"
    class="border-t border-purple-100 bg-white transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950"
  >
    <div
      class="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-3 lg:px-8"
    >
      <div>
        <NuxtLink
          to="/"
          class="flex items-center gap-3"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-purple-100 p-0.5 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <img src="/images/logo conta.png" alt="Logo Conecta Enem" class="h-full w-full object-contain" />
          </div>

          <span
            class="font-bold text-[var(--color-primary-dark)] dark:text-purple-400"
          >
            Conecta Enem
          </span>
        </NuxtLink>

        <p
          class="mt-4 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400"
        >
          Plataforma social e gratuita de preparação para o ENEM.
        </p>
      </div>

      <div>
        <h3 class="font-bold text-zinc-900 dark:text-zinc-100">
          Plataforma
        </h3>

        <div
          class="mt-4 flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <a
            href="#recursos"
            class="transition hover:text-[var(--color-primary)] dark:hover:text-purple-400"
          >
            Recursos
          </a>

          <a
            href="#redacao"
            class="transition hover:text-[var(--color-primary)] dark:hover:text-purple-400"
          >
            Redação
          </a>

          <a
            href="#como-funciona"
            class="transition hover:text-[var(--color-primary)] dark:hover:text-purple-400"
          >
            Como funciona
          </a>
        </div>
      </div>

      <div>
        <h3 class="font-bold text-zinc-900 dark:text-zinc-100">
          Conta
        </h3>

        <div
          class="mt-4 flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <NuxtLink
            to="/login"
            class="transition hover:text-[var(--color-primary)] dark:hover:text-purple-400"
          >
            Entrar
          </NuxtLink>

          <NuxtLink
            to="/cadastro"
            class="transition hover:text-[var(--color-primary)] dark:hover:text-purple-400"
          >
            Criar conta
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="border-t border-purple-100 dark:border-zinc-800">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-zinc-400 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"
      >
        <span>
          © {{ new Date().getFullYear() }} Conecta Enem.
        </span>

        <span>
          Projeto social de preparação para o ENEM.
        </span>
      </div>
    </div>
  </footer>
</template>