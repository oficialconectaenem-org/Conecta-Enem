<script setup>
import { useQuestions } from '~/composables/useQuestions'

const props = defineProps({
  question: {
    type: Object,
    default: null
  },
  edit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'success',
  'cancel'
])

const { createQuestion, updateQuestion } = useQuestions()

const subjects = ref([])
const loadingSubjects = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const defaultOptions = () => [
  { letter: 'A', text: '', imageUrl: '', showImageField: false, imageInputMode: 'file', newUrl: '' },
  { letter: 'B', text: '', imageUrl: '', showImageField: false, imageInputMode: 'file', newUrl: '' },
  { letter: 'C', text: '', imageUrl: '', showImageField: false, imageInputMode: 'file', newUrl: '' },
  { letter: 'D', text: '', imageUrl: '', showImageField: false, imageInputMode: 'file', newUrl: '' },
  { letter: 'E', text: '', imageUrl: '', showImageField: false, imageInputMode: 'file', newUrl: '' }
]

const form = reactive({
  subjectId: '',
  title: '',
  statement: '',
  explanation: '',
  imageUrl: '',
  images: [],
  year: new Date().getFullYear(),
  difficulty: 'MEDIUM',
  correctAnswer: 'A',
  active: true,
  options: defaultOptions()
})

const newImageUrl = ref('')
const newImageTitle = ref('')
const imageInputMode = ref('file') // 'file' ou 'url'
const fileInputRef = ref(null)
const previewingIndex = ref(0)

// Modo de Texto / Enunciado (Texto 1, Texto 2, Texto 3...)
const statementMode = ref('single') // 'single' (enunciado padrão) ou 'multiple' (Texto 1, 2, 3...)
const numberingStyle = ref('roman') // 'roman' (Texto I, II...) ou 'numeric' (Texto 1, 2...)
const supportTexts = ref([
  { id: 1, title: 'Texto I', content: '', source: '' }
])
const questionPrompt = ref('') // Comando / Pergunta final da questão

function getNextTextTitle(idx) {
  if (numberingStyle.value === 'roman') {
    return `Texto ${toRoman(idx + 1)}`
  }
  return `Texto ${idx + 1}`
}

function switchStatementMode(mode) {
  if (mode === statementMode.value) return
  if (mode === 'multiple') {
    if (form.statement && (!supportTexts.value[0]?.content && !questionPrompt.value)) {
      questionPrompt.value = form.statement
    }
    statementMode.value = 'multiple'
  } else {
    const compiled = buildCompiledStatement()
    if (compiled) {
      form.statement = compiled
    }
    statementMode.value = 'single'
  }
}

function updateNumberingStyle(style) {
  numberingStyle.value = style
  supportTexts.value.forEach((txt, idx) => {
    const currentTitle = txt.title?.trim()
    const isStandard = !currentTitle || /^Texto\s+([IVXLCDM\d]+)$/i.test(currentTitle)
    if (isStandard) {
      txt.title = getNextTextTitle(idx)
    }
  })
}

function addSupportText() {
  const nextIdx = supportTexts.value.length
  supportTexts.value.push({
    id: Date.now() + Math.random(),
    title: getNextTextTitle(nextIdx),
    content: '',
    source: ''
  })
}

function removeSupportText(index) {
  if (supportTexts.value.length === 1) {
    supportTexts.value[0].content = ''
    supportTexts.value[0].source = ''
    return
  }
  supportTexts.value.splice(index, 1)
  supportTexts.value.forEach((txt, idx) => {
    const currentTitle = txt.title?.trim()
    if (/^Texto\s+([IVXLCDM\d]+)$/i.test(currentTitle)) {
      txt.title = getNextTextTitle(idx)
    }
  })
}

function buildCompiledStatement() {
  if (statementMode.value === 'single') {
    return form.statement?.trim() || ''
  }

  const parts = []
  supportTexts.value.forEach((txt, idx) => {
    if (!txt.content?.trim()) return
    const title = txt.title?.trim() || getNextTextTitle(idx)
    let block = `**${title.toUpperCase()}**\n\n${txt.content.trim()}`
    if (txt.source?.trim()) {
      block += `\n\n_${txt.source.trim()}_`
    }
    parts.push(block)
  })

  if (questionPrompt.value?.trim()) {
    parts.push(questionPrompt.value.trim())
  }

  return parts.join('\n\n')
}

function toRoman(num) {
  const romanMap = [
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' }
  ]
  let result = ''
  let n = num
  for (const { value, symbol } of romanMap) {
    while (n >= value) {
      result += symbol
      n -= value
    }
  }
  return result || String(num)
}

function getImageUrl(item) {
  if (!item) return ''
  return typeof item === 'object' ? (item.url || '') : item
}

function getImageTitle(item, idx = 0) {
  if (!item) return `Imagem ${idx + 1}`
  if (typeof item === 'object' && item.title) return item.title
  return `Imagem ${idx + 1}`
}

const activePreviewImage = computed(() => {
  if (form.images && form.images.length > 0) {
    const idx = Math.min(previewingIndex.value, form.images.length - 1)
    const item = form.images[idx]
    return getImageUrl(item)
  }
  return form.imageUrl ? form.imageUrl.trim() : null
})

const activePreviewTitle = computed(() => {
  if (form.images && form.images.length > 0) {
    const idx = Math.min(previewingIndex.value, form.images.length - 1)
    const item = form.images[idx]
    return getImageTitle(item, idx)
  }
  return 'Imagem 1'
})

function isBase64Image(str) {
  const url = typeof str === 'object' ? (str?.url || '') : str
  return typeof url === 'string' && url.startsWith('data:image/')
}

function addImageByUrl() {
  const url = newImageUrl.value.trim()
  if (!url) return
  if (!form.images) form.images = []

  const nextIdx = form.images.length + 1
  const title = newImageTitle.value.trim() || `Texto ${toRoman(nextIdx)}`

  form.images.push({
    url,
    title
  })

  newImageUrl.value = ''
  newImageTitle.value = ''
  previewingIndex.value = form.images.length - 1
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileUpload(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  if (!form.images) form.images = []

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        const nextIdx = form.images.length + 1
        form.images.push({
          url: e.target.result,
          title: `Texto ${toRoman(nextIdx)}`
        })
        previewingIndex.value = form.images.length - 1
      }
    }
    reader.readAsDataURL(file)
  })

  event.target.value = ''
}

function removeImage(index) {
  form.images.splice(index, 1)
  if (previewingIndex.value >= form.images.length) {
    previewingIndex.value = Math.max(0, form.images.length - 1)
  }
}

function selectPreview(index) {
  previewingIndex.value = index
}

function setCorrect(letter) {
  form.correctAnswer = letter
}

// Alternativas: Helpers para foto / link
function handleOptionFileUpload(event, option) {
  const file = event.target.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      option.imageUrl = e.target.result
      option.showImageField = false
    }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function setOptionImageUrl(option) {
  if (!option.newUrl?.trim()) return
  option.imageUrl = option.newUrl.trim()
  option.newUrl = ''
  option.showImageField = false
}

function removeOptionImage(option) {
  option.imageUrl = ''
  option.newUrl = ''
  option.showImageField = false
}

function toggleOptionImageField(option) {
  option.showImageField = !option.showImageField
}

async function loadSubjects() {
  loadingSubjects.value = true
  try {
    const response = await $fetch('/api/subjects/active').catch(() => null)
    if (response?.subjects) {
      subjects.value = response.subjects
    } else {
      const fallback = await $fetch('/api/subjects').catch(() => null)
      subjects.value = fallback?.subjects || []
    }
  } catch (err) {
    console.error('Erro ao carregar matérias:', err)
  } finally {
    loadingSubjects.value = false
  }
}

function prepareEdit() {
  if (!props.question) return

  form.subjectId = props.question.subjectId || props.question.subject?.id || ''
  form.title = props.question.title || ''
  form.statement = props.question.statement || ''
  form.explanation = props.question.explanation || ''

  // Detecta se a questão já possui múltiplos textos (ex: **TEXTO I** ou TEXTO 1)
  if (props.question.statement) {
    const rawStmt = props.question.statement
    const regex = /(?:^|\n+)(?:\*{0,2}(?:TEXTO|Texto)\s+([IVXLCDM\d]+)[^\n]*\*{0,2})/gi
    const matches = [...rawStmt.matchAll(regex)]

    if (matches.length >= 1) {
      statementMode.value = 'multiple'
      const parsedTexts = []

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        const startIndex = match.index
        const titleText = match[0].replace(/\*/g, '').replace(/[\r\n]/g, '').trim()
        const nextMatch = matches[i + 1]
        const nextStart = nextMatch ? nextMatch.index : rawStmt.length

        const fullBlock = rawStmt.substring(startIndex + match[0].length, nextStart).trim()

        let content = fullBlock
        let source = ''
        const sourceMatch = fullBlock.match(/\n+_(.*?)_$/s)
        if (sourceMatch) {
          source = sourceMatch[1]
          content = fullBlock.substring(0, sourceMatch.index).trim()
        }

        parsedTexts.push({
          id: i + 1,
          title: titleText,
          content: content,
          source: source
        })
      }

      supportTexts.value = parsedTexts
      questionPrompt.value = ''
    } else {
      statementMode.value = 'single'
    }
  } else {
    statementMode.value = 'single'
  }
  form.year = props.question.year || null
  form.difficulty = props.question.difficulty || 'MEDIUM'
  form.correctAnswer = props.question.correctAnswer || 'A'
  form.active = props.question.active !== undefined ? Boolean(props.question.active) : true

  // Carrega lista de imagens
  let loadedImages = []
  if (props.question.images) {
    try {
      const parsed = typeof props.question.images === 'string'
        ? JSON.parse(props.question.images)
        : props.question.images
      if (Array.isArray(parsed)) {
        loadedImages = parsed
          .map((item, idx) => {
            if (typeof item === 'string' && item.trim()) {
              return { url: item.trim(), title: `Imagem ${idx + 1}` }
            }
            if (item && item.url) {
              return {
                url: String(item.url).trim(),
                title: item.title?.trim() || `Imagem ${idx + 1}`
              }
            }
            return null
          })
          .filter(Boolean)
      }
    } catch {
      if (typeof props.question.images === 'string' && props.question.images.trim()) {
        loadedImages = [{ url: props.question.images.trim(), title: 'Imagem 1' }]
      }
    }
  }

  if (loadedImages.length === 0 && props.question.imageUrl) {
    loadedImages = [{ url: props.question.imageUrl.trim(), title: 'Imagem 1' }]
  }

  form.images = loadedImages
  form.imageUrl = loadedImages[0]?.url || ''
  previewingIndex.value = 0

  // Fill options
  const incomingOptions = props.question.options || props.question.alternatives || []
  const mappedOptions = defaultOptions().map(def => {
    const found = incomingOptions.find(o => String(o.letter).toUpperCase() === def.letter)
    const img = found?.imageUrl || found?.image || ''
    return {
      letter: def.letter,
      text: found ? (found.text || found.content || '') : '',
      imageUrl: img || '',
      showImageField: false,
      imageInputMode: 'file',
      newUrl: ''
    }
  })
  form.options = mappedOptions
}

watch(
  () => props.question,
  () => {
    prepareEdit()
  },
  { immediate: true, deep: true }
)

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.subjectId) {
    errorMessage.value = 'Por favor, selecione uma matéria para a questão.'
    return
  }

  if (statementMode.value === 'multiple') {
    const compiled = buildCompiledStatement()
    if (!compiled) {
      errorMessage.value = 'Preencha o conteúdo dos textos de apoio ou o comando da questão.'
      return
    }
    form.statement = compiled
  } else {
    if (!form.statement || !form.statement.trim()) {
      errorMessage.value = 'O enunciado da questão é obrigatório.'
      return
    }
  }

  // Ensure at least 2 options are filled with either text or an image
  const filledOptions = form.options.filter(o => (o.text && o.text.trim()) || (o.imageUrl && o.imageUrl.trim()))
  if (filledOptions.length < 2) {
    errorMessage.value = 'Preencha pelo menos duas alternativas (com texto ou foto).'
    return
  }

  submitting.value = true

  const imageList = Array.isArray(form.images)
    ? form.images
        .map((img, idx) => {
          if (typeof img === 'string' && img.trim()) {
            return { url: img.trim(), title: `Imagem ${idx + 1}` }
          }
          if (img && img.url) {
            return {
              url: String(img.url).trim(),
              title: img.title?.trim() || `Imagem ${idx + 1}`
            }
          }
          return null
        })
        .filter(Boolean)
    : []
  const primaryImage = imageList[0]?.url || (form.imageUrl?.trim() || null)

  const payload = {
    subjectId: form.subjectId,
    title: form.title?.trim() || null,
    statement: form.statement.trim(),
    explanation: form.explanation?.trim() || null,
    imageUrl: primaryImage,
    images: imageList,
    difficulty: form.difficulty,
    year: form.year ? Number(form.year) : null,
    correctAnswer: form.correctAnswer,
    active: form.active,
    options: form.options.map(o => ({
      letter: o.letter,
      text: o.text?.trim() || '',
      imageUrl: o.imageUrl?.trim() || null
    }))
  }

  try {
    let result
    if (props.edit && props.question?.id) {
      result = await updateQuestion(props.question.id, payload)
      successMessage.value = 'Questão atualizada com sucesso!'
    } else {
      result = await createQuestion(payload)
      successMessage.value = 'Questão cadastrada com sucesso!'
    }

    emit('success', result)
  } catch (err) {
    console.error('Erro ao salvar questão:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Erro ao salvar a questão. Tente novamente.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSubjects()
  prepareEdit()
})
</script>

<template>
  <form
    class="space-y-8 rounded-3xl border border-[var(--admin-border,#e9e7ee)] bg-[var(--admin-card,#ffffff)] p-6 shadow-sm sm:p-8"
    @submit.prevent="submit"
  >
    <!-- CABEÇALHO DO FORMULÁRIO -->
    <div class="flex flex-col gap-2 border-b border-zinc-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-black text-zinc-900">
          {{ edit ? "Editar questão" : "Nova questão" }}
        </h2>
        <p class="mt-1 text-sm text-zinc-500">
          {{ edit ? "Atualize os dados e alternativas da questão no banco ENEM." : "Cadastre uma nova questão completa com alternativas e gabarito." }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
      </div>
    </div>

    <!-- ALERTA DE ERRO -->
    <div
      v-if="errorMessage"
      class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
    >
      <span class="material-symbols-rounded text-xl shrink-0">error</span>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- ALERTA DE SUCESSO -->
    <div
      v-if="successMessage"
      class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
    >
      <span class="material-symbols-rounded text-xl shrink-0">check_circle</span>
      <span>{{ successMessage }}</span>
    </div>

    <!-- METADADOS PRINCIPAIS -->
    <div class="grid gap-5 md:grid-cols-3">
      <!-- MATÉRIA -->
      <div>
        <label class="form-label required">
          Matéria
        </label>
        <select
          v-model="form.subjectId"
          class="form-input"
          required
        >
          <option value="" disabled>
            {{ loadingSubjects ? "Carregando matérias..." : "Selecione a matéria" }}
          </option>
          <option
            v-for="subject in subjects"
            :key="subject.id"
            :value="subject.id"
          >
            {{ subject.name || subject.title }}
          </option>
        </select>
      </div>

      <!-- ANO -->
      <div>
        <label class="form-label">
          Ano da Prova
        </label>
        <input
          v-model="form.year"
          type="number"
          min="1998"
          max="2030"
          class="form-input"
          placeholder="Ex: 2024"
        />
      </div>

      <!-- DIFICULDADE -->
      <div>
        <label class="form-label required">
          Dificuldade
        </label>
        <select
          v-model="form.difficulty"
          class="form-input"
        >
          <option value="EASY">Fácil</option>
          <option value="MEDIUM">Média</option>
          <option value="HARD">Difícil</option>
        </select>
      </div>
    </div>

    <!-- TÍTULO / IDENTIFICADOR -->
    <div>
      <label class="form-label">
        Título ou Subtítulo (Opcional)
      </label>
      <input
        v-model="form.title"
        class="form-input"
        placeholder="Ex: Questão 135 — Caderno Azul / Função Afim"
      />
    </div>

    <!-- ENUNCIADO E TEXTOS DE APOIO -->
    <div class="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-4">
        <div>
          <label class="form-label mb-0 text-base font-bold text-zinc-900 required">
            Enunciado e Textos de Apoio
          </label>
          <p class="text-xs text-zinc-500">
            Escolha se a questão possui texto único ou múltiplos textos de apoio (Texto 1, Texto 2, Texto 3...).
          </p>
        </div>

        <!-- SELETOR DE MODO DO ENUNCIADO -->
        <div class="flex items-center gap-1.5 rounded-xl bg-white p-1 border border-zinc-200 shadow-2xs">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
            :class="statementMode === 'single'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'"
            @click="switchStatementMode('single')"
          >
            <span class="material-symbols-rounded text-sm">article</span>
            Texto Único (Padrão)
          </button>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
            :class="statementMode === 'multiple'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'"
            @click="switchStatementMode('multiple')"
          >
            <span class="material-symbols-rounded text-sm">library_books</span>
            Textos de Apoio (Texto 1, 2, 3...)
          </button>
        </div>
      </div>

      <!-- MODO 1: TEXTO ÚNICO (PADRÃO / CASO NÃO TENHA MÚLTIPLOS) -->
      <div v-if="statementMode === 'single'" class="space-y-2">
        <textarea
          v-model="form.statement"
          rows="7"
          class="form-input resize-y"
          placeholder="Digite ou cole aqui o texto completo do enunciado da questão..."
        ></textarea>
        <p class="text-xs text-zinc-500">
          💡 Caso a questão tenha dois ou mais textos motivadores, clique em <strong>"Textos de Apoio (Texto 1, 2, 3...)"</strong> acima para organizá-los separadamente.
        </p>
      </div>

      <!-- MODO 2: MÚLTIPLOS TEXTOS (TEXTO 1, 2, 3...) -->
      <div v-else class="space-y-4">
        <!-- BARRA DE CONFIGURAÇÃO DE TEXTOS -->
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 border border-zinc-200">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-zinc-600">Estilo da numeração:</span>
            <div class="inline-flex rounded-lg border border-zinc-200 p-0.5">
              <button
                type="button"
                class="rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                :class="numberingStyle === 'roman' ? 'bg-purple-100 text-purple-700' : 'text-zinc-600 hover:text-zinc-900'"
                @click="updateNumberingStyle('roman')"
              >
                Romano (I, II, III)
              </button>
              <button
                type="button"
                class="rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                :class="numberingStyle === 'numeric' ? 'bg-purple-100 text-purple-700' : 'text-zinc-600 hover:text-zinc-900'"
                @click="updateNumberingStyle('numeric')"
              >
                Numérico (1, 2, 3)
              </button>
            </div>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 cursor-pointer"
            @click="addSupportText"
          >
            <span class="material-symbols-rounded text-sm">add</span>
            Adicionar {{ numberingStyle === 'roman' ? `Texto ${toRoman(supportTexts.length + 1)}` : `Texto ${supportTexts.length + 1}` }}
          </button>
        </div>

        <!-- LISTA DE CARDS DE TEXTOS DE APOIO -->
        <div class="space-y-3">
          <div
            v-for="(item, idx) in supportTexts"
            :key="item.id"
            class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3 transition"
          >
            <div class="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-black text-purple-700">
                  <span class="material-symbols-rounded text-xs">notes</span>
                  {{ item.title || getNextTextTitle(idx) }}
                </span>
                <input
                  v-model="item.title"
                  type="text"
                  class="h-7 rounded-lg border border-zinc-200 px-2 text-xs font-medium text-zinc-700 focus:border-purple-500 outline-none"
                  placeholder="Nome do texto (ex: Texto I, Poema, Notícia)"
                />
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                title="Remover este texto"
                @click="removeSupportText(idx)"
              >
                <span class="material-symbols-rounded text-base">delete</span>
                <span class="hidden sm:inline">Remover</span>
              </button>
            </div>

            <!-- CONTEÚDO DO TEXTO -->
            <div>
              <textarea
                v-model="item.content"
                rows="4"
                class="form-input text-xs sm:text-sm resize-y"
                :placeholder="`Digite ou cole aqui o conteúdo do ${item.title || getNextTextTitle(idx)}...`"
              ></textarea>
            </div>

            <!-- FONTE / REFERÊNCIA -->
            <div>
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-rounded text-sm text-zinc-400">menu_book</span>
                <input
                  v-model="item.source"
                  type="text"
                  class="form-input text-xs"
                  placeholder="Fonte / Referência bibliográfica (opcional - ex: SILVA, M. In: Obra..., 2022)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- COMANDO / PERGUNTA DA QUESTÃO -->
        <div class="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
          <label class="form-label mb-0 text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <span class="material-symbols-rounded text-base text-purple-600">help</span>
            Comando / Pergunta da Questão
          </label>
          <p class="text-xs text-zinc-500">
            A pergunta ou comando que finaliza a questão após os textos (ex: "Considerando os textos I e II, infere-se que...").
          </p>
          <textarea
            v-model="questionPrompt"
            rows="3"
            class="form-input text-xs sm:text-sm resize-y bg-white"
            placeholder="Digite aqui o comando final da questão..."
          ></textarea>
        </div>
      </div>
    </div>

    <!-- IMAGENS DA QUESTÃO (FOTO OU LINK) -->
    <div class="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label class="form-label mb-0 text-base font-bold text-zinc-900">
            Imagens da Questão
          </label>
          <p class="text-xs text-zinc-500">
            Adicione uma ou mais fotos do seu dispositivo ou links de imagem da web.
          </p>
        </div>

        <span
          v-if="form.images.length > 0"
          class="inline-flex items-center gap-1.5 self-start rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700"
        >
          <span class="material-symbols-rounded text-sm">photo_library</span>
          {{ form.images.length }} {{ form.images.length === 1 ? 'imagem' : 'imagens' }}
        </span>
      </div>

      <!-- SELETOR DE MODO: FOTO OU LINK -->
      <div class="flex items-center gap-2 border-b border-zinc-200/80 pb-3">
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition"
          :class="imageInputMode === 'file'
            ? 'bg-purple-600 text-white shadow-xs'
            : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'"
          @click="imageInputMode = 'file'"
        >
          <span class="material-symbols-rounded text-base">upload_file</span>
          Carregar Foto do Computador/Celular
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition"
          :class="imageInputMode === 'url'
            ? 'bg-purple-600 text-white shadow-xs'
            : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'"
          @click="imageInputMode = 'url'"
        >
          <span class="material-symbols-rounded text-base">link</span>
          Inserir Link / URL
        </button>
      </div>

      <!-- INPUT: CARREGAR FOTO (FILE) -->
      <div v-if="imageInputMode === 'file'" class="space-y-3">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handleFileUpload"
        />

        <div
          class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-6 text-center transition hover:border-purple-500 hover:bg-purple-50"
          @click="triggerFileInput"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-900/10">
            <span class="material-symbols-rounded text-2xl">add_photo_alternate</span>
          </div>
          <p class="mt-3 text-sm font-bold text-zinc-800">
            Clique para selecionar uma ou mais fotos
          </p>
          <p class="mt-1 text-xs text-zinc-500">
            Formatos suportados: PNG, JPG, JPEG, WEBP. Você pode escolher mais de um arquivo.
          </p>
        </div>
      </div>

      <!-- INPUT: INSERIR LINK (URL) -->
      <div v-else class="space-y-3">
        <div class="grid gap-2 sm:grid-cols-3">
          <div class="sm:col-span-1">
            <input
              v-model="newImageTitle"
              type="text"
              class="form-input text-xs"
              placeholder="Título (ex: Texto I, Imagem 1, Figura)"
              @keydown.enter.prevent="addImageByUrl"
            />
          </div>
          <div class="sm:col-span-2 flex gap-2">
            <input
              v-model="newImageUrl"
              type="url"
              class="form-input flex-1 text-xs"
              placeholder="Cole o link da imagem (https://exemplo.com/imagem.png)"
              @keydown.enter.prevent="addImageByUrl"
            />
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-purple-700 disabled:opacity-50 shrink-0"
              :disabled="!newImageUrl.trim()"
              @click="addImageByUrl"
            >
              <span class="material-symbols-rounded text-base">add</span>
              Adicionar
            </button>
          </div>
        </div>
        <p class="text-xs text-zinc-500">
          Você pode adicionar múltiplos links. Defina um título como <strong>Texto I</strong>, <strong>Imagem 1</strong> ou <strong>Figura I</strong> para cada um.
        </p>
      </div>

      <!-- LISTA DE MINIATURAS DAS IMAGENS ADICIONADAS -->
      <div v-if="form.images.length > 0" class="space-y-3 pt-2">
        <p class="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Imagens anexadas ({{ form.images.length }}) — Edite o título e clique para pré-visualizar:
        </p>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="(img, idx) in form.images"
            :key="idx"
            class="group relative flex flex-col overflow-hidden rounded-xl border-2 transition cursor-pointer"
            :class="previewingIndex === idx
              ? 'border-purple-600 ring-2 ring-purple-600/20 shadow-md'
              : 'border-zinc-200 bg-white hover:border-zinc-300'"
            @click="selectPreview(idx)"
          >
            <!-- IMAGEM THUMBNAIL -->
            <div class="relative h-32 w-full bg-zinc-100 flex items-center justify-center overflow-hidden">
              <img
                :src="getImageUrl(img)"
                alt="Miniatura"
                class="h-full w-full object-contain p-1"
              />

              <!-- BADGE TIPO (FOTO OU LINK) -->
              <span
                class="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase shadow-xs"
                :class="isBase64Image(img)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'"
              >
                {{ isBase64Image(img) ? 'Foto' : 'Link' }}
              </span>

              <!-- BOTÃO DE REMOVER -->
              <button
                type="button"
                title="Remover imagem"
                class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 text-white opacity-90 transition hover:opacity-100 hover:scale-110 shadow-xs"
                @click.stop="removeImage(idx)"
              >
                <span class="material-symbols-rounded text-sm">close</span>
              </button>
            </div>

            <!-- CAMPO DE TÍTULO EDITÁVEL DA IMAGEM -->
            <div class="bg-zinc-50 p-2 border-t border-zinc-100">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold uppercase text-purple-700">Título:</span>
                <input
                  v-model="img.title"
                  type="text"
                  class="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 outline-none focus:border-purple-500"
                  :placeholder="`Ex: Texto ${toRoman(idx + 1)}`"
                  @click.stop
                />
              </div>
            </div>
          </div>
        </div>

        <!-- PREVIEW GRANDE DA IMAGEM SELECIONADA -->
        <div
          v-if="activePreviewImage"
          class="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs"
        >
          <div class="mb-2 flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span class="text-purple-700 font-extrabold text-sm">{{ activePreviewTitle }}</span>
            <span
              class="rounded-md px-2 py-0.5 text-[11px] font-bold"
              :class="isBase64Image(activePreviewImage)
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-emerald-50 text-emerald-700'"
            >
              {{ isBase64Image(activePreviewImage) ? 'Foto anexada' : 'Link web' }}
            </span>
          </div>

          <div class="flex items-center justify-center rounded-xl bg-zinc-50 p-2">
            <img
              :src="activePreviewImage"
              :alt="activePreviewTitle"
              class="max-h-96 w-auto rounded-lg object-contain shadow-xs"
              @error="errorMessage = 'Não foi possível carregar a imagem selecionada.'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ALTERNATIVAS -->
    <div>
      <div class="mb-3 flex items-center justify-between">
        <div>
          <label class="form-label required mb-0">
            Alternativas e Gabarito
          </label>
          <p class="text-xs text-zinc-500">
            Clique na letra da alternativa para definir qual é a <strong>resposta correta (Gabarito)</strong>.
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs font-bold text-emerald-700">
          <span>Gabarito selecionado:</span>
          <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 font-extrabold text-white">
            {{ form.correctAnswer }}
          </span>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="option in form.options"
          :key="option.letter"
          class="flex items-start gap-3 rounded-2xl border p-3 transition"
          :class="
            form.correctAnswer === option.letter
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
              : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50'
          "
        >
          <!-- BOTÃO GABARITO -->
          <button
            type="button"
            :title="`Definir alternativa ${option.letter} como resposta correta`"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-sm transition shadow-xs"
            :class="
              form.correctAnswer === option.letter
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:border-emerald-500 hover:text-emerald-700'
            "
            @click="setCorrect(option.letter)"
          >
            {{ option.letter }}
          </button>

          <!-- CONTEÚDO DA ALTERNATIVA: TEXTO E/OU FOTO -->
          <div class="flex-1 space-y-2">
            <!-- TEXTO DA ALTERNATIVA -->
            <textarea
              v-model="option.text"
              rows="2"
              class="form-input resize-y py-2 text-sm"
              :placeholder="`Texto da Alternativa ${option.letter} (opcional se houver foto)...`"
            ></textarea>

            <!-- SE TEM FOTO ANEXADA: MOSTRA PREVIEW -->
            <div
              v-if="option.imageUrl"
              class="relative flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xs"
            >
              <div class="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200/80">
                <img
                  :src="option.imageUrl"
                  alt="Foto da alternativa"
                  class="h-full w-full object-contain p-1"
                />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase"
                    :class="isBase64Image(option.imageUrl)
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                  >
                    {{ isBase64Image(option.imageUrl) ? 'Foto anexada' : 'Link Web' }}
                  </span>
                  <span class="text-xs text-zinc-500 truncate">Imagem da Alternativa {{ option.letter }}</span>
                </div>
                <p class="mt-1 text-[11px] text-zinc-400">
                  Esta imagem será exibida como resposta desta alternativa.
                </p>
              </div>

              <button
                type="button"
                title="Remover foto da alternativa"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                @click="removeOptionImage(option)"
              >
                <span class="material-symbols-rounded text-base">delete</span>
              </button>
            </div>

            <!-- BOTÃO PARA ADICIONAR FOTO (SE NÃO TIVER AINDA E PAINEL NÃO ESTIVER ABERTO) -->
            <div v-else-if="!option.showImageField" class="flex items-center">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-purple-500 hover:text-purple-700 hover:bg-purple-50/50"
                @click="toggleOptionImageField(option)"
              >
                <span class="material-symbols-rounded text-base text-purple-600">add_photo_alternate</span>
                Adicionar foto ou gráfico nesta alternativa
              </button>
            </div>

            <!-- PAINEL DE ADICIONAR IMAGEM NA ALTERNATIVA -->
            <div
              v-if="!option.imageUrl && option.showImageField"
              class="space-y-2 rounded-xl border border-purple-200 bg-purple-50/40 p-3"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                    :class="option.imageInputMode === 'file'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'"
                    @click="option.imageInputMode = 'file'"
                  >
                    Foto do Dispositivo
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2.5 py-1 text-[11px] font-bold transition"
                    :class="option.imageInputMode === 'url'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'"
                    @click="option.imageInputMode = 'url'"
                  >
                    Link / URL
                  </button>
                </div>

                <button
                  type="button"
                  class="text-xs text-zinc-500 hover:text-zinc-700 font-semibold"
                  @click="option.showImageField = false"
                >
                  Cancelar
                </button>
              </div>

              <!-- INPUT DE ARQUIVO DA ALTERNATIVA -->
              <div v-if="option.imageInputMode === 'file'" class="pt-1">
                <label class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-white py-3 px-4 text-center transition hover:border-purple-500 hover:bg-purple-50/30">
                  <span class="material-symbols-rounded text-lg text-purple-600">upload_file</span>
                  <span class="text-xs font-bold text-zinc-700">Clique para escolher a foto (PNG, JPG, WEBP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleOptionFileUpload($event, option)"
                  />
                </label>
              </div>

              <!-- INPUT DE LINK DA ALTERNATIVA -->
              <div v-else class="flex gap-2 pt-1">
                <input
                  v-model="option.newUrl"
                  type="url"
                  class="form-input flex-1 py-1.5 text-xs bg-white"
                  placeholder="https://exemplo.com/grafico-alternativa.png"
                  @keydown.enter.prevent="setOptionImageUrl(option)"
                />
                <button
                  type="button"
                  class="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
                  :disabled="!option.newUrl?.trim()"
                  @click="setOptionImageUrl(option)"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RESOLUÇÃO / EXPLICAÇÃO -->
    <div>
      <label class="form-label">
        Resolução Comentada / Explicação (Opcional)
      </label>
      <textarea
        v-model="form.explanation"
        rows="4"
        class="form-input resize-y"
        placeholder="Explique o passo a passo da resolução para ajudar os alunos nos estudos..."
      ></textarea>
    </div>

    <!-- STATUS ATIVO -->
    <div class="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <input
        id="active-question"
        v-model="form.active"
        type="checkbox"
        class="h-5 w-5 rounded-md border-zinc-300 text-purple-600 focus:ring-purple-500"
      />
      <label
        for="active-question"
        class="text-sm font-semibold text-zinc-900 cursor-pointer mb-0!"
      >
        Questão Ativa (visível para os alunos realizarem simulados e listas de treino)
      </label>
    </div>

    <!-- BOTÕES DE AÇÃO -->
    <div class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="rounded-2xl border border-zinc-200 px-6 py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
        @click="emit('cancel')"
      >
        Cancelar
      </button>

      <button
        type="submit"
        :disabled="submitting"
        class="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-purple-700 shadow-md shadow-purple-600/20 disabled:opacity-50"
      >
        <span
          v-if="submitting"
          class="material-symbols-rounded animate-spin text-lg"
        >
          progress_activity
        </span>
        <span>
          {{ submitting ? "Salvando questão..." : (edit ? "Atualizar questão" : "Salvar questão") }}
        </span>
      </button>
    </div>
  </form>
</template>

<style scoped>
.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #27272a;
}

.form-label.required::after {
  content: " *";
  color: #dc2626;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  color: #18181b;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #9333ea;
  box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.12);
}
</style>