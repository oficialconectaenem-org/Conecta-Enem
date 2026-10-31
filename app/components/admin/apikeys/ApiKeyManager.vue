<script setup>
const loading = ref(true)
const keys = ref([])
const hasEnvFallback = ref(false)
const envKeyMasked = ref(null)

const error = ref('')
const successMessage = ref('')
const selectedProviderFilter = ref('ALL')

// Definição completa de provedores suportados
const PROVIDERS = [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    shortName: 'Gemini',
    description: 'Modelos Gemini 2.5, 2.0 e 1.5 Flash (AI Studio)',
    defaultModel: 'gemini-2.5-flash',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: 'neurology',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
  },
  {
    id: 'OPENAI',
    name: 'OpenAI (ChatGPT)',
    shortName: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o1 e o3',
    defaultModel: 'gpt-4o-mini',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: 'psychology',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    id: 'DEEPSEEK',
    name: 'DeepSeek AI',
    shortName: 'DeepSeek',
    description: 'DeepSeek Chat (V3) e DeepSeek Reasoner (R1)',
    defaultModel: 'deepseek-chat',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    icon: 'explore',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
  },
  {
    id: 'GROQ',
    name: 'Groq Cloud',
    shortName: 'Groq',
    description: 'Ultra-rápido: Llama 3.3 70B, Mixtral',
    defaultModel: 'llama-3.3-70b-versatile',
    docsUrl: 'https://console.groq.com/keys',
    icon: 'bolt',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
  },
  {
    id: 'OPENROUTER',
    name: 'OpenRouter',
    shortName: 'OpenRouter',
    description: 'Hub global com centenas de modelos abertos e fechados',
    defaultModel: 'openai/gpt-4o-mini',
    docsUrl: 'https://openrouter.ai/keys',
    icon: 'alt_route',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
  },
  {
    id: 'ANTHROPIC',
    name: 'Anthropic Claude',
    shortName: 'Claude',
    description: 'Claude 3.5 Sonnet e Claude 3.5 Haiku',
    defaultModel: 'claude-3-5-haiku-20241022',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: 'smart_toy',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 dark:border-fuchsia-800'
  },
  {
    id: 'CUSTOM',
    name: 'Personalizado',
    shortName: 'Custom',
    description: 'Qualquer API compatível com OpenAI (Ollama, vLLM, etc.)',
    defaultModel: '',
    docsUrl: '',
    icon: 'terminal',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
  }
]

// Modal Criar/Editar
const showModal = ref(false)
const isEditing = ref(false)
const modalLoading = ref(false)
const currentId = ref(null)

const form = ref({
  name: '',
  key: '',
  provider: 'GEMINI',
  model: '',
  baseUrl: '',
  active: true
})

const showSecret = ref(false)
const testingFormKey = ref(false)
const formTestResult = ref(null)

// Teste em linha (na lista)
const testingKeyId = ref(null)
const inlineTestResults = ref({})

// Modal Exclusão
const showDeleteModal = ref(false)
const keyToDelete = ref(null)
const deleting = ref(false)

// Cópia
const copiedId = ref(null)

function getProviderMeta(providerId) {
  const norm = (providerId || 'GEMINI').toUpperCase()
  return PROVIDERS.find(p => p.id === norm) || PROVIDERS[PROVIDERS.length - 1]
}

const activeCount = computed(() => keys.value.filter(k => k.active).length)
const errorCount = computed(() => keys.value.filter(k => (k.errorCount || 0) > 0).length)
const connectedProvidersCount = computed(() => {
  const set = new Set(keys.value.map(k => (k.provider || 'GEMINI').toUpperCase()))
  return set.size
})

const filteredKeys = computed(() => {
  if (selectedProviderFilter.value === 'ALL') return keys.value
  return keys.value.filter(k => (k.provider || 'GEMINI').toUpperCase() === selectedProviderFilter.value)
})

const currentProviderMeta = computed(() => getProviderMeta(form.value.provider))

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

function openCreateModal(providerId = 'GEMINI') {
  isEditing.value = false
  currentId.value = null
  const meta = getProviderMeta(providerId)
  form.value = {
    name: '',
    key: '',
    provider: meta.id,
    model: '',
    baseUrl: '',
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
    key: '', // Por segurança não traz a chave bruta, só se for atualizar
    provider: (keyItem.provider || 'GEMINI').toUpperCase(),
    model: keyItem.model || '',
    baseUrl: keyItem.baseUrl || '',
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
    const payload = {
      provider: form.value.provider,
      model: form.value.model.trim() || undefined,
      baseUrl: form.value.baseUrl.trim() || undefined
    }

    if (form.value.key.trim()) {
      payload.key = form.value.key.trim()
    } else if (currentId.value) {
      payload.id = currentId.value
    }

    const res = await $fetch('/api/admin/api-keys/test', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    })

    formTestResult.value = res
  } catch (err) {
    formTestResult.value = {
      valid: false,
      error: err.data?.statusMessage || err.message || 'Erro ao conectar à API de Inteligência Artificial.'
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

  if (form.value.provider === 'CUSTOM' && !form.value.baseUrl.trim()) {
    formTestResult.value = { valid: false, error: 'Para provedores personalizados, a URL Base é obrigatória (ex: http://localhost:11434/v1).' }
    return
  }

  modalLoading.value = true
  formTestResult.value = null

  try {
    const payload = {
      name: form.value.name.trim(),
      provider: form.value.provider,
      model: form.value.model.trim() || null,
      baseUrl: form.value.baseUrl.trim() || null,
      active: form.value.active
    }

    if (form.value.key.trim()) {
      payload.key = form.value.key.trim()
    }

    if (isEditing.value) {
      await $fetch(`/api/admin/api-keys/${currentId.value}`, {
        method: 'PUT',
        body: payload,
        credentials: 'include'
      })
      successMessage.value = 'Chave de API atualizada com sucesso!'
    } else {
      await $fetch('/api/admin/api-keys', {
        method: 'POST',
        body: payload,
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
      keyItem.errorCount = 0
      keyItem.lastError = null
    }
  } catch (err) {
    inlineTestResults.value[keyItem.id] = {
      valid: false,
      error: err.data?.statusMessage || err.message || 'Erro no teste de conexão.'
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
          Cadastre chaves de qualquer provedor (Gemini, OpenAI, DeepSeek, Groq, OpenRouter, Anthropic ou Custom) com rotação inteligente e failover automático para a correção de redações.
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
          @click="openCreateModal('GEMINI')"
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

      <!-- PROVEDORES CONECTADOS -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
            <span class="material-symbols-rounded">hub</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Provedores de IA</div>
            <div class="text-2xl font-black text-zinc-900 dark:text-zinc-100">{{ connectedProvidersCount }} / {{ PROVIDERS.length }}</div>
          </div>
        </div>
      </div>

      <!-- STATUS DO SISTEMA -->
      <div class="flex items-center justify-between p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div class="flex items-center gap-3.5">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl font-bold"
            :class="errorCount === 0 && activeCount > 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'"
          >
            <span class="material-symbols-rounded">{{ errorCount === 0 && activeCount > 0 ? 'verified_user' : 'warning' }}</span>
          </div>
          <div>
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Saúde da IA</div>
            <div class="text-sm font-black text-zinc-900 dark:text-zinc-100">
              {{ activeCount === 0 ? 'Sem Chaves' : errorCount === 0 ? '100% Operacional' : `${errorCount} com alerta` }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BANNER DE FALLBACK (.ENV) -->
    <div
      v-if="hasEnvFallback"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 text-xs"
    >
      <div class="flex items-center gap-3">
        <span class="material-symbols-rounded text-blue-600 dark:text-blue-400 text-xl">shield</span>
        <div>
          <p class="font-bold text-blue-900 dark:text-blue-200">
            Chave de contingência configurada no arquivo .env
          </p>
          <p class="text-blue-700/80 dark:text-blue-300/80 text-[11px]">
            O sistema possui chave fixa configurada no servidor ({{ envKeyMasked }}), usada caso todas as chaves do banco de dados fiquem offline.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold text-[10px] uppercase tracking-wider">
          Proteção Ativa
        </span>
      </div>
    </div>

    <!-- SELETOR RÁPIDO DE PROVEDOR PARA FILTRAR -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        @click="selectedProviderFilter = 'ALL'"
        class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border"
        :class="selectedProviderFilter === 'ALL'
          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'"
      >
        Todos os Provedores ({{ keys.length }})
      </button>

      <button
        v-for="prov in PROVIDERS"
        :key="prov.id"
        type="button"
        @click="selectedProviderFilter = prov.id"
        class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 border"
        :class="selectedProviderFilter === prov.id
          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'"
      >
        <span class="material-symbols-rounded text-sm">{{ prov.icon }}</span>
        <span>{{ prov.shortName }}</span>
        <span class="text-[10px] opacity-75">({{ keys.filter(k => (k.provider || 'GEMINI').toUpperCase() === prov.id).length }})</span>
      </button>
    </div>

    <!-- LISTAGEM DE CHAVES CADASTRADAS -->
    <div class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
      <!-- CABEÇALHO DO CARD -->
      <div class="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 class="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Chaves de Inteligência Artificial Cadastradas
          </h2>
          <p class="text-xs text-zinc-400">
            A IA avalia cada redação rotacionando entre as chaves ativas saudáveis para evitar limites de cota.
          </p>
        </div>
      </div>

      <!-- ESTADO VAZIO -->
      <div v-if="!loading && filteredKeys.length === 0" class="p-12 text-center space-y-4">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
          <span class="material-symbols-rounded text-3xl">key_off</span>
        </div>
        <div>
          <h3 class="text-base font-black text-zinc-800 dark:text-zinc-200">
            {{ selectedProviderFilter === 'ALL' ? 'Nenhuma chave cadastrada no banco' : 'Nenhuma chave cadastrada para este provedor' }}
          </h3>
          <p class="text-xs text-zinc-400 max-w-md mx-auto mt-1">
            Cadastre sua primeira chave de API (Gemini, OpenAI, DeepSeek, Groq, OpenRouter ou Anthropic) para alimentar o corretor de redações.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            v-for="prov in PROVIDERS.slice(0, 4)"
            :key="prov.id"
            type="button"
            @click="openCreateModal(prov.id)"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-purple-500 hover:text-purple-600 transition cursor-pointer shadow-2xs"
          >
            <span class="material-symbols-rounded text-sm">{{ prov.icon }}</span>
            <span>+ Adicionar {{ prov.shortName }}</span>
          </button>
        </div>
      </div>

      <!-- LISTA DE CHAVES -->
      <div v-else class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div
          v-for="keyItem in filteredKeys"
          :key="keyItem.id"
          class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
        >
          <!-- INFORMAÇÕES DA CHAVE -->
          <div class="space-y-2 max-w-2xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {{ keyItem.name }}
              </span>

              <!-- BADGE DO PROVEDOR -->
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider"
                :class="getProviderMeta(keyItem.provider).badgeClass"
              >
                <span class="material-symbols-rounded text-xs">{{ getProviderMeta(keyItem.provider).icon }}</span>
                {{ getProviderMeta(keyItem.provider).shortName }}
              </span>

              <!-- MODELO PERSONALIZADO (SE HOUVER) -->
              <span
                v-if="keyItem.model"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono font-bold"
                :title="`Modelo configurado: ${keyItem.model}`"
              >
                <span class="material-symbols-rounded text-[10px]">smart_toy</span>
                {{ keyItem.model }}
              </span>

              <!-- BASE URL PERSONALIZADA (SE HOUVER) -->
              <span
                v-if="keyItem.baseUrl"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono truncate max-w-[200px]"
                :title="`URL Base: ${keyItem.baseUrl}`"
              >
                <span class="material-symbols-rounded text-[10px]">link</span>
                {{ keyItem.baseUrl }}
              </span>

              <!-- BADGE DE ATIVO/INATIVO -->
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="keyItem.active ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="keyItem.active ? 'bg-emerald-500' : 'bg-zinc-400'" />
                {{ keyItem.active ? 'Ativa' : 'Desativada' }}
              </span>

              <!-- BADGE DE ALERTA DE ERROS -->
              <span
                v-if="(keyItem.errorCount || 0) > 0"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold"
                :title="`${keyItem.errorCount} falha(s) recente(s)`"
              >
                <span class="material-symbols-rounded text-xs">warning</span>
                {{ keyItem.errorCount }} falha(s)
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
                class="text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded-md transition cursor-pointer"
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
                title="Testar conexão com a API"
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
                title="Editar configurações da chave"
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        @click.self="showModal = false"
      >
        <div class="relative w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 my-8">
          <!-- CABEÇALHO DO MODAL -->
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-zinc-800 text-purple-700 dark:text-purple-400 font-bold">
                <span class="material-symbols-rounded text-xl">{{ currentProviderMeta.icon }}</span>
              </div>
              <div>
                <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {{ isEditing ? 'Editar Chave de API' : 'Cadastrar Nova Chave de API' }}
                </h3>
                <p class="text-[11px] text-zinc-400">
                  {{ currentProviderMeta.name }} • {{ currentProviderMeta.description }}
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
            <!-- SELEÇÃO DO PROVEDOR -->
            <div>
              <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Selecione o Provedor de IA *
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="prov in PROVIDERS"
                  :key="prov.id"
                  type="button"
                  @click="form.provider = prov.id"
                  class="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer"
                  :class="form.provider === prov.id
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400'"
                >
                  <span class="material-symbols-rounded text-base shrink-0">{{ prov.icon }}</span>
                  <span class="truncate">{{ prov.shortName }}</span>
                </button>
              </div>
            </div>

            <!-- NOME IDENTIFICADOR -->
            <div>
              <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nome Identificador da Chave *
              </label>
              <input
                v-model="form.name"
                type="text"
                :placeholder="`Ex: ${currentProviderMeta.name} - Produção ou Conta Backup`"
                class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <span class="text-[10px] text-zinc-400 mt-1 block">
                Um nome amigável para identificar a conta ou projeto de onde esta chave se origina.
              </span>
            </div>

            <!-- CHAVE DE API (INPUT COM TOGGLE) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {{ isEditing ? 'Nova Chave de API (deixe em branco para manter a atual)' : 'Chave de API (API Key) *' }}
                </label>
                <a
                  v-if="currentProviderMeta.docsUrl"
                  :href="currentProviderMeta.docsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Obter chave em {{ currentProviderMeta.shortName }}
                  <span class="material-symbols-rounded text-xs">open_in_new</span>
                </a>
              </div>

              <div class="relative">
                <input
                  v-model="form.key"
                  :type="showSecret ? 'text' : 'password'"
                  :placeholder="form.provider === 'GEMINI' ? 'AIzaSy...' : form.provider === 'OPENAI' ? 'sk-proj-...' : form.provider === 'DEEPSEEK' ? 'sk-...' : 'Cole sua chave de API aqui...'"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pl-3.5 pr-20 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <button
                  type="button"
                  @click="showSecret = !showSecret"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md cursor-pointer"
                  :title="showSecret ? 'Ocultar' : 'Visualizar'"
                >
                  <span class="material-symbols-rounded text-base">
                    {{ showSecret ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- CAMPOS AVANÇADOS: MODELO & BASE URL -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- MODELO ESPECÍFICO (OPCIONAL) -->
              <div>
                <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Modelo Específico (Opcional)
                </label>
                <input
                  v-model="form.model"
                  type="text"
                  :placeholder="`Padrão: ${currentProviderMeta.defaultModel || 'automático'}`"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <span class="text-[10px] text-zinc-400 mt-0.5 block">
                  Deixe vazio para usar o modelo recomendado padrão.
                </span>
              </div>

              <!-- URL BASE (CUSTOM OU PROXY) -->
              <div>
                <label class="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  URL Base (Opcional)
                </label>
                <input
                  v-model="form.baseUrl"
                  type="text"
                  :placeholder="form.provider === 'CUSTOM' ? 'http://localhost:11434/v1' : 'https://...'"
                  class="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <span class="text-[10px] text-zinc-400 mt-0.5 block">
                  Necessário apenas para Ollama, proxies ou servidor próprio.
                </span>
              </div>
            </div>

            <!-- BOTÃO DE TESTAR CONEXÃO DO FORMULÁRIO -->
            <div>
              <button
                type="button"
                @click="testCurrentFormKey"
                :disabled="testingFormKey || (!form.key.trim() && !isEditing)"
                class="w-full py-2.5 px-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <span class="material-symbols-rounded text-base text-emerald-600 shrink-0">check_circle</span>
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
                <p class="text-[10px] text-zinc-500">Se desativada, a chave não será incluída nas chamadas de IA da plataforma.</p>
              </div>
              <input
                v-model="form.active"
                type="checkbox"
                class="h-5 w-5 rounded-md border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>

          <!-- BOTÕES DO MODAL -->
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="handleSaveKey"
              :disabled="modalLoading"
              class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shadow-purple-600/25"
            >
              <span v-if="modalLoading" class="material-symbols-rounded text-sm animate-spin">sync</span>
              <span>{{ isEditing ? 'Atualizar Chave' : 'Cadastrar Chave' }}</span>
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
        <div class="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div class="flex items-center gap-3 text-red-600">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
              <span class="material-symbols-rounded text-xl">delete_forever</span>
            </div>
            <div>
              <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100">Excluir Chave de API?</h3>
              <p class="text-[11px] text-zinc-400">Esta ação não poderá ser desfeita.</p>
            </div>
          </div>

          <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Tem certeza que deseja remover a chave <strong class="text-zinc-900 dark:text-zinc-100 font-bold">"{{ keyToDelete?.name }}"</strong> ({{ getProviderMeta(keyToDelete?.provider).name }})?
          </p>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showDeleteModal = false"
              :disabled="deleting"
              class="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="confirmDelete"
              :disabled="deleting"
              class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5"
            >
              <span v-if="deleting" class="material-symbols-rounded text-sm animate-spin">sync</span>
              <span>Excluir Chave</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
