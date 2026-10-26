<script setup>
const activeTab = ref('topics') // 'topics', 'arguments', 'repertoires'

// --- ESTADOS DE CARREGAMENTO & DADOS ---
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const topics = ref([])
const argumentsList = ref([])
const repertoires = ref([])

// --- MODAIS DE EDICAO / CRIACAO ---
const showModal = ref(false)
const modalType = ref('') // 'topic', 'argument', 'repertoire'
const isEditing = ref(false)
const editId = ref(null)

const formTopic = reactive({
  title: '',
  axis: '',
  description: '',
  motivationText: '',
  imageUrl: '',
  motivatorsList: [], // [{ title: 'Texto I', content: '', imageUrl: '' }]
  active: true
})

function addMotivator() {
  const num = formTopic.motivatorsList.length + 1
  formTopic.motivatorsList.push({
    title: `Texto ${num}`,
    content: '',
    imageUrl: ''
  })
}

function removeMotivator(index) {
  formTopic.motivatorsList.splice(index, 1)
}

function handleTopicImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    formTopic.imageUrl = e.target.result
  }
  reader.readAsDataURL(file)
}

function handleMotivatorImageUpload(event, index) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    formTopic.motivatorsList[index].imageUrl = e.target.result
  }
  reader.readAsDataURL(file)
}

const formArgument = reactive({
  title: '',
  axis: '',
  content: '',
  application: '',
  active: true
})

const formRepertoire = reactive({
  title: '',
  author: '',
  axis: '',
  content: '',
  quote: '',
  active: true
})

// --- CARREGAR DADOS ---
async function fetchAllData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [topRes, argRes, repRes] = await Promise.all([
      $fetch('/api/admin/redacao/topics').catch(() => ({ topics: [] })),
      $fetch('/api/admin/redacao/arguments').catch(() => ({ arguments: [] })),
      $fetch('/api/admin/redacao/repertoires').catch(() => ({ repertoires: [] }))
    ])
    topics.value = topRes.topics || []
    argumentsList.value = argRes.arguments || []
    repertoires.value = repRes.repertoires || []
  } catch (err) {
    errorMessage.value = err.statusMessage || 'Erro ao carregar dados do laboratório de redação.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllData()
})

// --- ABRIR MODAL ---
function openCreateModal(type) {
  modalType.value = type
  isEditing.value = false
  editId.value = null

  if (type === 'topic') {
    Object.assign(formTopic, {
      title: '',
      axis: '',
      description: '',
      motivationText: '',
      imageUrl: '',
      motivatorsList: [
        { title: 'Texto I', content: '', imageUrl: '' }
      ],
      active: true
    })
  } else if (type === 'argument') {
    Object.assign(formArgument, { title: '', axis: '', content: '', application: '', active: true })
  } else if (type === 'repertoire') {
    Object.assign(formRepertoire, { title: '', author: '', axis: '', content: '', quote: '', active: true })
  }
  showModal.value = true
}

function openEditModal(type, item) {
  modalType.value = type
  isEditing.value = true
  editId.value = item.id

  if (type === 'topic') {
    let parsedMotivators = []
    if (item.motivationText) {
      try {
        const parsed = JSON.parse(item.motivationText)
        if (Array.isArray(parsed)) {
          parsedMotivators = parsed
        }
      } catch (e) {
        parsedMotivators = [{ title: 'Texto I', content: item.motivationText, imageUrl: '' }]
      }
    }
    if (parsedMotivators.length === 0) {
      parsedMotivators = [{ title: 'Texto I', content: '', imageUrl: '' }]
    }

    Object.assign(formTopic, {
      title: item.title || '',
      axis: item.axis || '',
      description: item.description || '',
      motivationText: item.motivationText || '',
      imageUrl: item.imageUrl || '',
      motivatorsList: parsedMotivators,
      active: item.active !== undefined ? item.active : true
    })
  } else if (type === 'argument') {
    Object.assign(formArgument, {
      title: item.title || '',
      axis: item.axis || '',
      content: item.content || '',
      application: item.application || '',
      active: item.active !== undefined ? item.active : true
    })
  } else if (type === 'repertoire') {
    Object.assign(formRepertoire, {
      title: item.title || '',
      author: item.author || '',
      axis: item.axis || '',
      content: item.content || '',
      quote: item.quote || '',
      active: item.active !== undefined ? item.active : true
    })
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

// --- SALVAR ---
async function handleSave() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (modalType.value === 'topic') {
      const payload = {
        title: formTopic.title,
        axis: formTopic.axis,
        description: formTopic.description,
        motivationText: JSON.stringify(formTopic.motivatorsList),
        imageUrl: formTopic.imageUrl,
        active: formTopic.active
      }
      if (isEditing.value) {
        await $fetch(`/api/admin/redacao/topics/${editId.value}`, { method: 'PUT', body: payload })
        successMessage.value = 'Tema atualizado com sucesso!'
      } else {
        await $fetch('/api/admin/redacao/topics', { method: 'POST', body: payload })
        successMessage.value = 'Novo tema criado com sucesso!'
      }
    } else if (modalType.value === 'argument') {
      const payload = { ...formArgument }
      if (isEditing.value) {
        await $fetch(`/api/admin/redacao/arguments/${editId.value}`, { method: 'PUT', body: payload })
        successMessage.value = 'Argumento atualizado com sucesso!'
      } else {
        await $fetch('/api/admin/redacao/arguments', { method: 'POST', body: payload })
        successMessage.value = 'Novo argumento criado com sucesso!'
      }
    } else if (modalType.value === 'repertoire') {
      const payload = { ...formRepertoire }
      if (isEditing.value) {
        await $fetch(`/api/admin/redacao/repertoires/${editId.value}`, { method: 'PUT', body: payload })
        successMessage.value = 'Repertório atualizado com sucesso!'
      } else {
        await $fetch('/api/admin/redacao/repertoires', { method: 'POST', body: payload })
        successMessage.value = 'Novo repertório criado com sucesso!'
      }
    }

    closeModal()
    await fetchAllData()
  } catch (err) {
    errorMessage.value = err.data?.statusMessage || err.statusMessage || 'Erro ao salvar informações.'
  } finally {
    saving.value = false
  }
}

// --- REMOVER ---
async function handleDelete(type, id) {
  if (!confirm('Tem certeza que deseja remover este item?')) return

  try {
    if (type === 'topic') {
      await $fetch(`/api/admin/redacao/topics/${id}`, { method: 'DELETE' })
    } else if (type === 'argument') {
      await $fetch(`/api/admin/redacao/arguments/${id}`, { method: 'DELETE' })
    } else if (type === 'repertoire') {
      await $fetch(`/api/admin/redacao/repertoires/${id}`, { method: 'DELETE' })
    }
    successMessage.value = 'Item removido com sucesso!'
    await fetchAllData()
  } catch (err) {
    errorMessage.value = err.data?.statusMessage || 'Erro ao deletar item.'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5 bg-white p-6 rounded-2xl shadow-xs">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 flex items-center gap-2.5">
          <span class="material-symbols-rounded text-purple-600 text-3xl">edit_note</span>
          Laboratório de Redação
        </h1>
        <p class="text-sm text-zinc-500 mt-1">
          Gerencie temas de redação, bancos de argumentos e repertórios socioculturais para os alunos.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md hover:bg-purple-700 transition cursor-pointer"
        @click="openCreateModal(activeTab === 'topics' ? 'topic' : activeTab === 'arguments' ? 'argument' : 'repertoire')"
      >
        <span class="material-symbols-rounded text-lg">add</span>
        Cadastrar {{ activeTab === 'topics' ? 'Tema' : activeTab === 'arguments' ? 'Argumento' : 'Repertório' }}
      </button>
    </div>

    <!-- MENSAGENS -->
    <div v-if="successMessage" class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center justify-between">
      <span>{{ successMessage }}</span>
      <button @click="successMessage = ''" class="text-emerald-700 hover:text-emerald-900 font-bold">&times;</button>
    </div>
    <div v-if="errorMessage" class="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center justify-between">
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = ''" class="text-red-700 hover:text-red-900 font-bold">&times;</button>
    </div>

    <!-- TABS DE NAVEGACAO -->
    <div class="flex border-b border-zinc-200 gap-2 bg-white px-4 rounded-xl">
      <button
        type="button"
        class="px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer"
        :class="activeTab === 'topics' ? 'border-purple-600 text-purple-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'"
        @click="activeTab = 'topics'"
      >
        <span class="material-symbols-rounded text-lg">topic</span>
        Temas de Redação ({{ topics.length }})
      </button>
      <button
        type="button"
        class="px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer"
        :class="activeTab === 'arguments' ? 'border-purple-600 text-purple-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'"
        @click="activeTab = 'arguments'"
      >
        <span class="material-symbols-rounded text-lg">chat_bubble</span>
        Argumentos ({{ argumentsList.length }})
      </button>
      <button
        type="button"
        class="px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer"
        :class="activeTab === 'repertoires' ? 'border-purple-600 text-purple-600' : 'border-transparent text-zinc-500 hover:text-zinc-800'"
        @click="activeTab = 'repertoires'"
      >
        <span class="material-symbols-rounded text-lg">auto_stories</span>
        Repertórios ({{ repertoires.length }})
      </button>
    </div>

    <!-- SPINNER -->
    <div v-if="loading" class="py-12 text-center text-zinc-400 bg-white rounded-2xl">
      <span class="material-symbols-rounded text-4xl animate-spin">progress_activity</span>
      <p class="mt-2 text-sm font-medium">Carregando conteúdos...</p>
    </div>

    <!-- CONTEUDO DAS TABS -->
    <div v-else>
      <!-- TAB 1: TEMAS -->
      <div v-if="activeTab === 'topics'" class="space-y-4">
        <div v-if="topics.length === 0" class="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-xs">
          <span class="material-symbols-rounded text-5xl text-zinc-300">topic</span>
          <p class="mt-2 text-base font-bold text-zinc-700">Nenhum tema cadastrado</p>
          <p class="text-xs text-zinc-400 mt-1">Clique no botão acima para adicionar o primeiro tema de redação.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in topics"
            :key="item.id"
            class="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <span v-if="item.axis" class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-extrabold uppercase tracking-wide">
                  {{ item.axis }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold" :class="item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'">
                  {{ item.active ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
              <h3 class="text-base font-bold text-zinc-900 mt-2.5 leading-snug">
                {{ item.title }}
              </h3>
              <p v-if="item.description" class="text-xs text-zinc-500 mt-2 line-clamp-2">
                {{ item.description }}
              </p>
              <div v-if="item.imageUrl" class="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2 max-h-40 overflow-hidden flex items-center justify-center">
                <img :src="item.imageUrl" alt="Gráfico / Imagem motivadora" class="max-h-36 object-contain rounded-lg" />
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="openEditModal('topic', item)"
              >
                <span class="material-symbols-rounded text-sm">edit</span> Editar
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="handleDelete('topic', item.id)"
              >
                <span class="material-symbols-rounded text-sm">delete</span> Remover
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: ARGUMENTOS -->
      <div v-if="activeTab === 'arguments'" class="space-y-4">
        <div v-if="argumentsList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-xs">
          <span class="material-symbols-rounded text-5xl text-zinc-300">chat_bubble</span>
          <p class="mt-2 text-base font-bold text-zinc-700">Nenhum argumento cadastrado</p>
          <p class="text-xs text-zinc-400 mt-1">Adicione argumentos estratégicos para ajudar os alunos.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in argumentsList"
            :key="item.id"
            class="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <span v-if="item.axis" class="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-extrabold uppercase tracking-wide">
                  {{ item.axis }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold" :class="item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'">
                  {{ item.active ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
              <h3 class="text-base font-bold text-zinc-900 mt-2.5">
                {{ item.title }}
              </h3>
              <p class="text-xs text-zinc-600 mt-2 line-clamp-3">
                {{ item.content }}
              </p>
              <div v-if="item.application" class="mt-2.5 p-2.5 rounded-xl bg-zinc-50 text-[11px] text-zinc-600 border border-zinc-100">
                <strong>Aplicação:</strong> {{ item.application }}
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="openEditModal('argument', item)"
              >
                <span class="material-symbols-rounded text-sm">edit</span> Editar
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="handleDelete('argument', item.id)"
              >
                <span class="material-symbols-rounded text-sm">delete</span> Remover
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: REPERTORIOS -->
      <div v-if="activeTab === 'repertoires'" class="space-y-4">
        <div v-if="repertoires.length === 0" class="text-center py-12 bg-white rounded-2xl border border-zinc-200 shadow-xs">
          <span class="material-symbols-rounded text-5xl text-zinc-300">auto_stories</span>
          <p class="mt-2 text-base font-bold text-zinc-700">Nenhum repertório cadastrado</p>
          <p class="text-xs text-zinc-400 mt-1">Cadastre alusões históricas, citações e conceitos filosóficos.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="item in repertoires"
            :key="item.id"
            class="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <span v-if="item.axis" class="px-2.5 py-1 rounded-lg bg-fuchsia-50 text-fuchsia-700 text-xs font-extrabold uppercase tracking-wide">
                  {{ item.axis }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold" :class="item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'">
                  {{ item.active ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
              <h3 class="text-base font-bold text-zinc-900 mt-2.5">
                {{ item.title }}
              </h3>
              <p v-if="item.author" class="text-xs font-semibold text-purple-600 mt-0.5">
                Por: {{ item.author }}
              </p>
              <p class="text-xs text-zinc-600 mt-2 line-clamp-3">
                {{ item.content }}
              </p>
              <blockquote v-if="item.quote" class="mt-2.5 p-2.5 rounded-xl border-l-3 border-purple-500 bg-purple-50/50 text-[11px] italic text-zinc-700">
                "{{ item.quote }}"
              </blockquote>
            </div>

            <div class="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="openEditModal('repertoire', item)"
              >
                <span class="material-symbols-rounded text-sm">edit</span> Editar
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                @click="handleDelete('repertoire', item.id)"
              >
                <span class="material-symbols-rounded text-sm">delete</span> Remover
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE CADASTRO / EDICAO (FUNDO CLARO) -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Fundo de sobreposição suave claro/transparente -->
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" @click="closeModal"></div>

        <div class="relative z-10 w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 class="text-lg font-black text-zinc-900 dark:text-zinc-100">
              {{ isEditing ? 'Editar' : 'Cadastrar' }}
              {{ modalType === 'topic' ? 'Tema de Redação' : modalType === 'argument' ? 'Argumento' : 'Repertório Sociocultural' }}
            </h3>
            <button @click="closeModal" class="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-lg cursor-pointer">
              &times;
            </button>
          </div>

          <form @submit.prevent="handleSave" class="space-y-4 text-sm">
            <!-- CAMPOS DO TEMA -->
            <template v-if="modalType === 'topic'">
              <div>
                <label class="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">Título do Tema *</label>
                <input
                  v-model="formTopic.title"
                  type="text"
                  required
                  placeholder="Ex: Desafios para a valorização de povos tradicionais no Brasil"
                  class="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Eixo Temático</label>
                <input
                  v-model="formTopic.axis"
                  type="text"
                  placeholder="Ex: Meio Ambiente, Sociedade, Tecnologia, Cultura"
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Descrição / Instruções</label>
                <textarea
                  v-model="formTopic.description"
                  rows="2"
                  placeholder="Instruções gerais sobre o tema..."
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none resize-none"
                ></textarea>
              </div>

              <!-- CAPA OU GRÁFICO PRINCIPAL DO TEMA -->
              <div>
                <label class="block font-bold text-zinc-800 mb-1">Imagem / Gráfico Principal do Tema (opcional)</label>
                <div class="space-y-2">
                  <input
                    v-model="formTopic.imageUrl"
                    type="url"
                    placeholder="Cole a URL da Imagem/Gráfico (http://... ou https://...)"
                    class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                  />
                  <div class="flex items-center gap-2">
                    <label class="px-4 py-2 rounded-xl border border-zinc-300 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer flex items-center gap-2 transition">
                      <span class="material-symbols-rounded text-base text-purple-600">upload_file</span>
                      <span>Ou carregar arquivo de imagem</span>
                      <input type="file" accept="image/*" class="hidden" @change="handleTopicImageUpload" />
                    </label>
                    <button
                      v-if="formTopic.imageUrl"
                      type="button"
                      @click="formTopic.imageUrl = ''"
                      class="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
                    >
                      Remover Imagem Principal
                    </button>
                  </div>

                  <div v-if="formTopic.imageUrl" class="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-2 max-h-48 overflow-hidden flex items-center justify-center">
                    <img :src="formTopic.imageUrl" alt="Preview da Imagem Principal" class="max-h-44 object-contain rounded-xl" />
                  </div>
                </div>
              </div>

              <!-- TEXTOS MOTIVADORES SEPARADOS -->
              <div class="space-y-3 pt-2 border-t border-zinc-200">
                <div class="flex items-center justify-between">
                  <label class="block font-bold text-zinc-800">Textos Motivadores de Apoio</label>
                  <button
                    type="button"
                    @click="addMotivator"
                    class="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span class="material-symbols-rounded text-sm">add</span>
                    Adicionar Texto Motivador
                  </button>
                </div>

                <div v-if="formTopic.motivatorsList.length === 0" class="text-xs text-zinc-400 italic p-3 bg-zinc-50 rounded-xl text-center">
                  Nenhum texto motivador adicionado. Clique no botão acima para adicionar.
                </div>

                <div
                  v-for="(mot, idx) in formTopic.motivatorsList"
                  :key="idx"
                  class="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3 relative"
                >
                  <div class="flex items-center justify-between gap-2">
                    <input
                      v-model="mot.title"
                      type="text"
                      placeholder="Ex: Texto I, Texto II, Gráfico Informativo"
                      class="font-bold text-xs text-purple-700 bg-white border border-zinc-300 rounded-lg px-2.5 py-1 w-48 focus:ring-2 focus:ring-purple-600/20 outline-none"
                    />
                    <button
                      type="button"
                      @click="removeMotivator(idx)"
                      class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span class="material-symbols-rounded text-base">delete</span>
                      <span>Remover</span>
                    </button>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-700 mb-1">Texto do Motivador</label>
                    <textarea
                      v-model="mot.content"
                      rows="3"
                      placeholder="Escreva ou cole o conteúdo do texto motivador..."
                      class="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-zinc-700 mb-1">Imagem / Gráfico deste Texto Motivador (opcional)</label>
                    <div class="space-y-2">
                      <input
                        v-model="mot.imageUrl"
                        type="url"
                        placeholder="Cole a URL da Imagem (http://... ou https://...)"
                        class="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                      />
                      <div class="flex items-center gap-2">
                        <label class="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer flex items-center gap-1.5 transition">
                          <span class="material-symbols-rounded text-sm text-purple-600">upload_file</span>
                          <span>Ou carregar imagem</span>
                          <input type="file" accept="image/*" class="hidden" @change="e => handleMotivatorImageUpload(e, idx)" />
                        </label>
                        <button
                          v-if="mot.imageUrl"
                          type="button"
                          @click="mot.imageUrl = ''"
                          class="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
                        >
                          Remover Imagem
                        </button>
                      </div>

                      <div v-if="mot.imageUrl" class="relative rounded-xl border border-zinc-200 bg-white p-2 max-h-36 overflow-hidden flex items-center justify-center">
                        <img :src="mot.imageUrl" alt="Preview Motivador" class="max-h-32 object-contain rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input v-model="formTopic.active" type="checkbox" id="topicActive" class="rounded text-purple-600 h-4 w-4" />
                <label for="topicActive" class="font-semibold text-zinc-800">Tema Ativo (Visível para alunos)</label>
              </div>
            </template>

            <!-- CAMPOS DO ARGUMENTO -->
            <template v-if="modalType === 'argument'">
              <div>
                <label class="block font-bold text-zinc-800 mb-1">Título do Argumento *</label>
                <input
                  v-model="formArgument.title"
                  type="text"
                  required
                  placeholder="Ex: Omissão Governamental / Ineficiência Estatal"
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Eixo Temático</label>
                <input
                  v-model="formArgument.axis"
                  type="text"
                  placeholder="Ex: Política, Sociedade, Cidadania"
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Conteúdo / Explicação *</label>
                <textarea
                  v-model="formArgument.content"
                  rows="3"
                  required
                  placeholder="Explicação detalhada da tese e desenvolvimento do argumento..."
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Como Aplicar na Redação (Exemplo)</label>
                <textarea
                  v-model="formArgument.application"
                  rows="2"
                  placeholder="Dica de como encaixar no Parágrafo D1 ou D2..."
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none resize-none"
                ></textarea>
              </div>

              <div class="flex items-center gap-2">
                <input v-model="formArgument.active" type="checkbox" id="argActive" class="rounded text-purple-600 h-4 w-4" />
                <label for="argActive" class="font-semibold text-zinc-800">Argumento Ativo</label>
              </div>
            </template>

            <!-- CAMPOS DO REPERTORIO -->
            <template v-if="modalType === 'repertoire'">
              <div>
                <label class="block font-bold text-zinc-800 mb-1">Título do Repertório *</label>
                <input
                  v-model="formRepertoire.title"
                  type="text"
                  required
                  placeholder="Ex: Constituição Federal de 1988 (Artigo 6º)"
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-zinc-800 mb-1">Autor / Referência</label>
                  <input
                    v-model="formRepertoire.author"
                    type="text"
                    placeholder="Ex: Zygmunt Bauman, CF/88"
                    class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                  />
                </div>
                <div>
                  <label class="block font-bold text-zinc-800 mb-1">Eixo Temático</label>
                  <input
                    v-model="formRepertoire.axis"
                    type="text"
                    placeholder="Ex: Filosofia, Legislação, Sociologia"
                    class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Explicação / Conceito *</label>
                <textarea
                  v-model="formRepertoire.content"
                  rows="3"
                  required
                  placeholder="Explicação do conceito ou fato histórico..."
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block font-bold text-zinc-800 mb-1">Citação / Frase de Impacto</label>
                <input
                  v-model="formRepertoire.quote"
                  type="text"
                  placeholder='Ex: "A educação é a arma mais poderosa..."'
                  class="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div class="flex items-center gap-2">
                <input v-model="formRepertoire.active" type="checkbox" id="repActive" class="rounded text-purple-600 h-4 w-4" />
                <label for="repActive" class="font-semibold text-zinc-800">Repertório Ativo</label>
              </div>
            </template>

            <div class="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button
                type="button"
                class="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 cursor-pointer"
                @click="closeModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span v-if="saving" class="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                {{ isEditing ? 'Atualizar' : 'Salvar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
