<script setup>
const loading = ref(true)
const keys = ref([])
const hasEnvFallback = ref(false)
const envKeyMasked = ref(null)

const error = ref('')
const successMessage = ref('')

// Modal Criar/Editar
const showModal = ref(false)
const isEditing = ref(false)
const modalLoading = ref(false)
const currentId = ref(null)

const form = ref({
  name: '',
  key: '',
  provider: 'GEMINI',
  active: true
})

const showSecret = ref(false)
const testingFormKey = ref(false)
const formTestResult = ref(null)

// Teste em linha (na tabela)
const testingKeyId = ref(null)
const inlineTestResults = ref({})

// Modal Exclusão
const showDeleteModal = ref(false)
const keyToDelete = ref(null)
const deleting = ref(false)

// Cópia
const copiedId = ref(null)

async function fetchKeys() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/admin/api-keys', { credentials: 'include' })
    if (res) {
      keys.value = res.keys || []
      hasEnvFallback.value = res.hasEnvFallback || false
      envKeyMasked.value = res.envKeyMasked || null
    }
  } catch (err) {
    error.value = 'Erro ao carregar lista de chaves de API.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const activeCount = computed(() => keys.value.filter(k => k.active).length)
const errorCount = computed(() => keys.value.filter(k => (k.errorCount || 0) > 0).length)

function openCreateModal() {
  isEditing.value = false
  currentId.value = null
  form.value = {
    name: '',
    key: '',
    provider: 'GEMINI',
    active: true
  }
  showSecret.value = false
  formTestResult.value = null
  showModal.value = true
}

function openEditModal(keyItem) {
  isEditing.value = true
  currentId.value = keyItem.id
  form.value = {
    name: keyItem.name,
    key: '', // Por segurança não preenche a chave bruta, só se o usuário quiser sobrescrever
    provider: keyItem.provider || 'GEMINI',
    active: Boolean(keyItem.active)
  }
  showSecret.value = false
  formTestResult.value = null
  showModal.value = true
}

async function testCurrentFormKey() {
  if (!form.value.key.trim() && !isEditing.value) {
    formTestResult.value = { valid: false, error: 'Digite uma chave de API para testar.' }
    return
  }

  testingFormKey.value = true
  formTestResult.value = null

  try {
    const payload = form.value.key.trim()
      ? { key: form.value.key.trim() }
      : { id: currentId.value }

    const res = await $fetch('/api/admin/api-keys/test', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    })

    formTestResult.value = res
  } catch (err) {
    formTestResult.value = {
      valid: false,
      error: err.data?.statusMessage || err.message || 'Erro ao conectar à API do Gemini.'
    }
  } finally {
    testingFormKey.value = false
  }
}

async function handleSaveKey() {
  if (!form.value.name.trim()) {
    formTestResult.value = { valid: false, error: 'Informe um nome identificador para a chave.' }
    return
  }

  if (!isEditing.value && !form.value.key.trim()) {
    formTestResult.value = { valid: false, error: 'A chave de API é obrigatória.' }
    return
  }

  modalLoading.value = true
  formTestResult.value = null

  try {
    if (isEditing.value) {
      await $fetch(`/api/admin/api-keys/${currentId.value}`, {
        method: 'PUT',
        body: form.value,
        credentials: 'include'
      })
      successMessage.value = 'Chave de API atualizada com sucesso!'
    } else {
      await $fetch('/api/admin/api-keys', {
        method: 'POST',
        body: form.value,
        credentials: 'include'
      })
      successMessage.value = 'Nova chave de API cadastrada com sucesso!'
    }

    showModal.value = false
    await fetchKeys()

    setTimeout(() => {
      successMessage.value = ''
    }, 4000)
  } catch (err) {
    formTestResult.value = {
      valid: false,
      error: err.data?.statusMessage || err.message || 'Falha ao salvar a chave de API.'
    }
  } finally {
    modalLoading.value = false
  }
}

async function toggleActive(keyItem) {
  const nextState = !keyItem.active
  keyItem.active = nextState // Otimista

  try {
    await $fetch(`/api/admin/api-keys/${keyItem.id}`, {
      method: 'PUT',
      body: { active: nextState },
      credentials: 'include'
    })
    successMessage.value = `Chave "${keyItem.name}" ${nextState ? 'ativada' : 'desativada'} com sucesso.`
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    keyItem.active = !nextState // Reverte
    error.value = 'Falha ao alterar status da chave de API.'
  }
}

async function handleInlineTest(keyItem) {
  testingKeyId.value = keyItem.id
  inlineTestResults.value[keyItem.id] = null

  try {
    const res = await $fetch('/api/admin/api-keys/test', {
      method: 'POST',
      body: { id: keyItem.id },
      credentials: 'include'
    })
    inlineTestResults.value[keyItem.id] = res

    if (res.valid) {
      // Zera o contador de erros visualmente
      keyItem.errorCount = 0
      keyItem.lastError = null
    }
  } catch (err) {
    inlineTestResults.value[keyItem.id] = {
      valid: false,
      error: err.data?.statusMessage || err.message || 'Erro no teste.'
    }
  } finally {
    testingKeyId.value = null
  }
}

function promptDelete(keyItem) {
  keyToDelete.value = keyItem
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!keyToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/admin/api-keys/${keyToDelete.value.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    successMessage.value = `Chave "${keyToDelete.value.name}" removida com sucesso.`
    showDeleteModal.value = false
    keyToDelete.value = null
    await fetchKeys()
    setTimeout(() => {
      successMessage.value = ''
    }, 4000)
  } catch (err) {
    error.value = 'Falha ao excluir chave de API.'
  } finally {
    deleting.value = false
  }
}

function copyToClipboard(text, id) {
  if (!text) return
  navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => {
    copiedId.value = null
  }, 2000)
}

function formatDate(dateStr) {
  if (!dateStr) return 'Nunca utilizada'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchKeys()
})
</script>

<template>
  <div class="space-y-6">
    <!-- CABEÇALHO -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-2xl text-purple-600 dark:text-purple-400">key</span>
          <h1 class="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Chaves de API & Inteligência Artificial
          </h1>
        </div>
        <p class="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Cadastre múltiplas chaves do Google Gemini com failover automático e rotação inteligente para o Laboratório de Redação.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="fetchKeys"
          :disabled="loading"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
          title="Recarregar chaves"
        >
          <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': loading }">sync</span>
          <span>Atualizar</span>
        </button>

        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition shadow-sm cursor-pointer shadow-purple-600/20 active:scale-95"
        >
          <span class="material-symbols-rounded text-base">add</span>
          <span>Nova Chave de API</span>
        </button>
      </div>
    </div>

    <!-- MENSAGENS DE SUCESSO E ERRO -->
    <div
      v-if="successMessage"
      class="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-fadeIn"
    >
      <span class="material-symbols-rounded text-emerald-600 dark:text-emerald-400 text-lg">check_circle</span>
      {{ successMessage }}
    </div>

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-xs font-bold text-red-800 dark:text-red-300 animate-fadeIn"
    >
      <span class="material-symbols-rounded text-red-600 dark:text-red-400 text-lg">error</span>
      {{ error }}
    </div>

    <!-- CARDS DE MÉTRICAS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- TOTAL DE CHAVES -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold">
            <span class="material-symbols-rounded">vpn_key</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Cadastradas</div>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ keys.length }}</div>
          </div>
        </div>
      </div>

      <!-- CHAVES ATIVAS -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold">
            <span class="material-symbols-rounded">check_circle</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Chaves Ativas</div>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ activeCount }}</div>
          </div>
        </div>
        <span class="flex h-2.5 w-2.5 rounded-full" :class="activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'" />
      </div>

      <!-- ALERTAS / ERROS -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl" :class="errorCount > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'">
            <span class="material-symbols-rounded">{{ errorCount > 0 ? 'warning' : 'verified_user' }}</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Com Erros / Cota</div>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ errorCount }}</div>
          </div>
        </div>
      </div>

      <!-- FALLBACK .ENV -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold">
            <span class="material-symbols-rounded">terminal</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Fallback no .env</div>
            <div class="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
              {{ hasEnvFallback ? 'Configurado' : 'Não configurado' }}
            </div>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" :class="hasEnvFallback ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'">
          {{ hasEnvFallback ? 'Ativo' : 'Ausente' }}
        </span>
      </div>
    </div>

    <!-- BANNER EXPLICATIVO DE ALTA DISPONIBILIDADE -->
    <div class="rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-fuchsia-50/50 dark:from-purple-950/20 dark:via-zinc-900/50 dark:to-fuchsia-950/20 p-5 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3.5">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white font-bold shadow-xs">
          <span class="material-symbols-rounded text-xl">auto_mode</span>
        </div>
        <div class="space-y-1">
          <h3 class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Rotação Inteligente & Redundância Ativa
          </h3>
          <p class="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            Quando você cadastra mais de uma chave do Gemini, o sistema distribui as requisições entre elas. Se uma chave atingir o limite de cota gratuita (Rate Limit 429) ou apresentar instabilidade, a próxima chave ativa assume automaticamente, sem interromper as correções dos alunos.
          </p>
        </div>
      </div>

      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white/80 dark:bg-zinc-900/80 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition shadow-2xs"
      >
        <span>Criar nova chave no Google</span>
        <span class="material-symbols-rounded text-sm">open_in_new</span>
      </a>
    </div>

    <!-- TABELA / LISTA DE CHAVES -->
    <div class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
      <div class="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
          Chaves Configuradas ({{ keys.length }})
        </h2>
        <span class="text-xs text-zinc-400">
          Provedor padrão: Google Gemini
        </span>
      </div>

      <!-- CARREGANDO -->
      <div v-if="loading" class="p-12 text-center space-y-3">
        <div class="h-8 w-8 animate-spin rounded-full border-3 border-purple-600 border-t-transparent mx-auto" />
        <p class="text-xs font-medium text-zinc-500">Carregando chaves de API...</p>
      </div>

      <!-- ESTADO VAZIO -->
      <div v-else-if="keys.length === 0" class="p-12 text-center space-y-4">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-zinc-800 text-purple-600 dark:text-purple-400 mx-auto">
          <span class="material-symbols-rounded text-3xl">key_off</span>
        </div>
        <div class="max-w-md mx-auto space-y-1">
          <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
            Nenhuma chave de API cadastrada no banco
          </h3>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Cadastre sua primeira chave de API do Google Gemini para alimentar o corretor de redações com inteligência artificial.
            <span v-if="hasEnvFallback" class="block mt-1 text-purple-600 dark:text-purple-400 font-semibold">
              (No momento o sistema está utilizando a chave configurada no arquivo .env)
            </span>
          </p>
        </div>
        <button
          type="button"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition shadow-sm cursor-pointer shadow-purple-600/20"
        >
          <span class="material-symbols-rounded text-base">add</span>
          <span>Cadastrar Primeira Chave</span>
        </button>
      </div>

      <!-- LISTAGEM -->
      <div v-else class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div
          v-for="keyItem in keys"
          :key="keyItem.id"
          class="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition"
        >
          <!-- IDENTIFICAÇÃO E CHAVE -->
          <div class="space-y-1.5 min-w-0 flex-1">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">
                {{ keyItem.name }}
              </span>

              <!-- BADGE DO PROVEDOR -->
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <span class="material-symbols-rounded text-xs">neurology</span>
                {{ keyItem.provider || 'GEMINI' }}
              </span>

              <!-- BADGE DE STATUS -->
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                :class="keyItem.active ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="keyItem.active ? 'bg-emerald-500' : 'bg-zinc-400'" />
                {{ keyItem.active ? 'Ativa' : 'Inativa' }}
              </span>

              <!-- BADGE DE SAÚDE / ERROS -->
              <span
                v-if="keyItem.errorCount > 0"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                :title="keyItem.lastError || 'Houve falha na última requisição'"
              >
                <span class="material-symbols-rounded text-xs">warning</span>
                {{ keyItem.errorCount }} falha(s)
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
              >
                <span class="material-symbols-rounded text-xs text-emerald-500">verified</span>
                Saudável
              </span>
            </div>

            <!-- CHAVE MASCARADA COM COPIAR -->
            <div class="flex items-center gap-2">
              <code class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs select-all">
                {{ keyItem.maskedKey }}
              </code>
              <button
                type="button"
                @click="copyToClipboard(keyItem.maskedKey, keyItem.id)"
                class="text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-md transition"
                title="Copiar visualização da chave"
              >
                <span class="material-symbols-rounded text-sm">
                  {{ copiedId === keyItem.id ? 'check' : 'content_copy' }}
                </span>
              </button>
              <span v-if="copiedId === keyItem.id" class="text-[10px] font-bold text-emerald-600">Copiado!</span>
            </div>

            <!-- RESULTADO DO TESTE INLINE (SE EXECUTADO) -->
            <div v-if="inlineTestResults[keyItem.id]" class="pt-1">
              <div
                v-if="inlineTestResults[keyItem.id].valid"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold"
              >
                <span class="material-symbols-rounded text-xs">task_alt</span>
                {{ inlineTestResults[keyItem.id].message }}
              </div>
              <div
                v-else
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px] font-bold"
              >
                <span class="material-symbols-rounded text-xs">error</span>
                {{ inlineTestResults[keyItem.id].error }}
              </div>
            </div>

            <div v-if="keyItem.lastError && !inlineTestResults[keyItem.id]" class="text-[11px] text-amber-600 dark:text-amber-400 truncate max-w-xl">
              Último alerta: {{ keyItem.lastError }}
            </div>
          </div>

          <!-- DATAS E AÇÕES -->
          <div class="flex items-center gap-3 lg:gap-4 shrink-0 justify-between lg:justify-end">
            <div class="text-right text-[11px] text-zinc-400 hidden sm:block">
              <div>Último uso: <strong class="text-zinc-700 dark:text-zinc-300 font-semibold">{{ formatDate(keyItem.lastUsedAt) }}</strong></div>
              <div>Criada em: {{ formatDate(keyItem.createdAt) }}</div>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- ATIVAR/DESATIVAR TOGGLE RÁPIDO -->
              <button
                type="button"
                @click="toggleActive(keyItem)"
                class="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-xs font-bold"
                :title="keyItem.active ? 'Desativar chave' : 'Ativar chave'"
              >
                <span class="material-symbols-rounded text-base" :class="keyItem.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'">
                  {{ keyItem.active ? 'toggle_on' : 'toggle_off' }}
                </span>
              </button>

              <!-- TESTAR CONEXÃO -->
              <button
                type="button"
                @click="handleInlineTest(keyItem)"
                :disabled="testingKeyId === keyItem.id"
                class="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950/40 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-300 transition cursor-pointer"
                title="Testar conexão com a API do Gemini"
              >
                <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': testingKeyId === keyItem.id }">
                  {{ testingKeyId === keyItem.id ? 'sync' : 'network_check' }}
                </span>
                <span>Testar</span>
              </button>

              <!-- EDITAR -->
              <button
                type="button"
                @click="openEditModal(keyItem)"
                class="p-2 rounded-xl text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Editar nome / chave"
              >
                <span class="material-symbols-rounded text-base">edit</span>
              </button>

              <!-- EXCLUIR -->
              <button
                type="button"
                @click="promptDelete(keyItem)"
                class="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                title="Excluir chave"
              >
                <span class="material-symbols-rounded text-base">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CADASTRO / EDIÇÃO -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fadeIn"
        @click.self="showModal = false"
      >
        <div class="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
          <!-- CABEÇALHO DO MODAL -->
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-purple-400 font-bold">
                <span class="material-symbols-rounded text-xl">vpn_key</span>
              </div>
              <div>
                <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {{ isEditing ? 'Editar Chave de API' : 'Cadastrar Nova Chave de API' }}
                </h3>
                <p class="text-[11px] text-zinc-400">
                  Google Gemini (Generative Language API)
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="showModal = false"
              class="h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-lg">close</span>
            </button>
          </div>

          <!-- FORMULÁRIO -->
          <div class="space-y-4">
            <!-- NOME IDENTIFICADOR -->
            <div>
              <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nome Identificador da Chave *
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ex: AI Studio - Conta Principal ou Conta Backup 1"
                class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <span class="text-[10px] text-zinc-400 mt-1 block">
                Um nome amigável para você identificar qual projeto ou conta do Google AI Studio gerou esta chave.
              </span>
            </div>

            <!-- PROVEDOR -->
            <div>
              <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Provedor de IA
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="form.provider = 'GEMINI'"
                  class="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition"
                  :class="form.provider === 'GEMINI' ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'"
                >
                  <span class="material-symbols-rounded text-base">neurology</span>
                  <span>Google Gemini</span>
                </button>
                <div
                  class="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 text-zinc-400 text-xs font-medium cursor-not-allowed"
                  title="Em breve"
                >
                  <span class="material-symbols-rounded text-base">mail</span>
                  <span>Resend / SMTP</span>
                </div>
              </div>
            </div>

            <!-- CHAVE DE API (INPUT COM TOGGLE) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {{ isEditing ? 'Nova Chave de API (deixe em branco para manter a atual)' : 'Chave de API (API Key) *' }}
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Obter chave no AI Studio
                  <span class="material-symbols-rounded text-xs">open_in_new</span>
                </a>
              </div>

              <div class="relative">
                <input
                  v-model="form.key"
                  :type="showSecret ? 'text' : 'password'"
                  placeholder="AIzaSy..."
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pl-3.5 pr-20 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <button
                  type="button"
                  @click="showSecret = !showSecret"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
                  :title="showSecret ? 'Ocultar' : 'Visualizar'"
                >
                  <span class="material-symbols-rounded text-base">
                    {{ showSecret ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- BOTÃO DE TESTAR CONEXÃO DO FORMULÁRIO -->
            <div>
              <button
                type="button"
                @click="testCurrentFormKey"
                :disabled="testingFormKey || (!form.key.trim() && !isEditing)"
                class="w-full py-2 px-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="material-symbols-rounded text-base" :class="{ 'animate-spin': testingFormKey }">
                  {{ testingFormKey ? 'sync' : 'network_check' }}
                </span>
                <span>{{ testingFormKey ? 'Verificando chave com a API...' : 'Testar Conexão desta Chave' }}</span>
              </button>

              <!-- FEEDBACK DO TESTE DO FORMULÁRIO -->
              <div v-if="formTestResult" class="mt-2.5">
                <div
                  v-if="formTestResult.valid"
                  class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
                >
                  <span class="material-symbols-rounded text-base text-emerald-600">check_circle</span>
                  <span>{{ formTestResult.message || 'Chave validada com sucesso!' }}</span>
                </div>
                <div
                  v-else
                  class="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-300 flex items-start gap-2"
                >
                  <span class="material-symbols-rounded text-base text-red-600 shrink-0 mt-0.5">error</span>
                  <span>{{ formTestResult.error }}</span>
                </div>
              </div>
            </div>

            <!-- SWITCH ATIVO -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
              <div>
                <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100">Chave Ativa para Rotação</p>
                <p class="text-[10px] text-zinc-500">Se desativada, a chave não será utilizada nas correções de redações.</p>
              </div>
              <button
                type="button"
                @click="form.active = !form.active"
                class="p-1 rounded-lg text-2xl transition cursor-pointer"
                :class="form.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'"
              >
                <span class="material-symbols-rounded">
                  {{ form.active ? 'toggle_on' : 'toggle_off' }}
                </span>
              </button>
            </div>
          </div>

          <!-- BOTÕES DE AÇÃO -->
          <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="handleSaveKey"
              :disabled="modalLoading"
              class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition shadow-sm cursor-pointer shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="modalLoading" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{{ isEditing ? 'Salvar Alterações' : 'Cadastrar Chave' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO -->
    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fadeIn"
        @click.self="showDeleteModal = false"
      >
        <div class="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 font-bold">
              <span class="material-symbols-rounded text-2xl">delete</span>
            </div>
            <div>
              <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Remover Chave de API
              </h3>
              <p class="text-xs text-zinc-500">
                Tem certeza que deseja excluir esta chave?
              </p>
            </div>
          </div>

          <p class="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed">
            A chave <strong>"{{ keyToDelete?.name }}"</strong> deixará de ser utilizada imediatamente nas correções de redação. Esta ação não pode ser desfeita.
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              @click="showDeleteModal = false"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="confirmDelete"
              :disabled="deleting"
              class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition shadow-sm cursor-pointer shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <span v-if="deleting" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Confirmar Exclusão</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

