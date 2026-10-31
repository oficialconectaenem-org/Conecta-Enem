<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  subjects: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'imported'])

const inputFormat = ref('TXT') // 'TXT' | 'JSON'
const rawInput = ref('')
const fileInputRef = ref(null)

// Filtros Globais Padrões
const defaultYear = ref(new Date().getFullYear())
const defaultSubjectId = ref('')
const defaultDifficulty = ref('MEDIUM')

// Inicializa a matéria padrão quando os subjects estiverem disponíveis
watch(
  () => props.subjects,
  (newSubjects) => {
    if (newSubjects && newSubjects.length > 0 && !defaultSubjectId.value) {
      defaultSubjectId.value = newSubjects[0].id
    }
  },
  { immediate: true }
)

// Estado da importação
const saving = ref(false)
const saveSuccessMessage = ref('')
const saveErrorMessage = ref('')

// Exemplos de modelo
const TXT_EXAMPLE = `[QUESTAO]
ANO: 2024
MATERIA: Matematica
DIFICULDADE: MEDIA
ENUNCIADO:
Um determinado produto sofreu um acréscimo de 20% em seu preço original. Pouco tempo depois, em uma liquidação, esse mesmo produto teve um desconto de 20% sobre o novo valor.
Em relação ao preço inicial, o valor final do produto:
A) Permaneceu rigorosamente o mesmo.
B) Teve uma redução de 4%.
C) Teve um aumento de 4%.
D) Teve uma redução de 2%.
E) Teve um aumento de 2%.
GABARITO: B
EXPLICACAO:
Se o preço original for 100, após o aumento de 20% passa para 120. Com o desconto de 20% sobre 120 (120 * 0,20 = 24), o preço final é 96. Em relação a 100, representa uma redução de 4%.

---

[QUESTAO]
ANO: 2024
MATERIA: Biologia
DIFICULDADE: FACIL
ENUNCIADO:
A organela celular responsável pela respiração celular aeróbica e pela síntese da maior parte do ATP (adenosina trifosfato) nas células eucarióticas é a:
A) Mitocôndria.
B) Complexo golgiense.
C) Ribossomo.
D) Lisossomo.
E) Retículo endoplasmático liso.
GABARITO: A
EXPLICACAO:
A mitocôndria é a principal responsável pela respiração celular aeróbia e pela produção de energia (ATP) nos seres eucariotos.`

const JSON_EXAMPLE = JSON.stringify([
  {
    statement: "Um determinado produto sofreu um acréscimo de 20% em seu preço original. Pouco tempo depois, em uma liquidação, teve um desconto de 20% sobre o novo valor.\nEm relação ao preço inicial, o valor final do produto:",
    year: 2024,
    subjectName: "Matemática",
    difficulty: "MEDIUM",
    correctAnswer: "B",
    explanation: "Se o preço original for 100, após +20% vai para 120. Com 20% de desconto sobre 120 (24), o valor final é 96 (redução de 4%).",
    options: [
      { letter: "A", text: "Permaneceu rigorosamente o mesmo." },
      { letter: "B", text: "Teve uma redução de 4%." },
      { letter: "C", text: "Teve um aumento de 4%." },
      { letter: "D", text: "Teve uma redução de 2%." },
      { letter: "E", text: "Teve um aumento de 2%." }
    ]
  },
  {
    statement: "A organela celular responsável pela respiração celular aeróbica e síntese de ATP nas células eucarióticas é a:",
    year: 2024,
    subjectName: "Biologia",
    difficulty: "EASY",
    correctAnswer: "A",
    explanation: "A mitocôndria realiza a respiração celular e a síntese da maior parte do ATP.",
    options: [
      { letter: "A", text: "Mitocôndria." },
      { letter: "B", text: "Complexo golgiense." },
      { letter: "C", text: "Ribossomo." },
      { letter: "D", text: "Lisossomo." },
      { letter: "E", text: "Retículo endoplasmático liso." }
    ]
  }
], null, 2)

function loadExample() {
  if (inputFormat.value === 'TXT') {
    rawInput.value = TXT_EXAMPLE
  } else {
    rawInput.value = JSON_EXAMPLE
  }
}

const placeholderText = computed(() => {
  if (inputFormat.value === 'TXT') {
    return `Cole aqui suas questões em formato TXT:

[QUESTAO]
ANO: 2024
MATERIA: Matematica
DIFICULDADE: MEDIA
ENUNCIADO: Enunciado da questao...
A) Alternativa A
B) Alternativa B
C) Alternativa C
D) Alternativa D
E) Alternativa E
GABARITO: B
EXPLICACAO: Resolucao da questao...
---`
  }

  return `Cole aqui um array JSON de questões:

[
  {
    "statement": "Enunciado da questao...",
    "year": 2024,
    "difficulty": "MEDIUM",
    "correctAnswer": "B",
    "options": [
      { "letter": "A", "text": "Opção 1" },
      { "letter": "B", "text": "Opção 2" }
    ]
  }
]`
})

function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const isJson = file.name.endsWith('.json') || file.type.includes('json')
  const isTxt = file.name.endsWith('.txt') || file.type.includes('text')

  if (isJson) inputFormat.value = 'JSON'
  else if (isTxt) inputFormat.value = 'TXT'

  const reader = new FileReader()
  reader.onload = (e) => {
    rawInput.value = String(e.target?.result || '')
  }
  reader.readAsText(file, 'UTF-8')

  // Limpa o input file para permitir selecionar o mesmo arquivo novamente se quiser
  event.target.value = ''
}

// -------------------------------------------------------------
// PARSERS (TXT e JSON) COM LIVE PREVIEW DOS CARDS
// -------------------------------------------------------------

function parseTxtQuestions(text) {
  if (!text || !text.trim()) return []

  // Divide por separadores comuns: [QUESTAO], ===, ---
  const blocks = text.split(/(?:\[QUEST(?:AO|ÃO)\]|===+|---+)/i)
    .map(b => b.trim())
    .filter(b => b.length > 15)

  // Se não encontrou blocos com os separadores acima, tenta dividir por números de questão "1.", "Questão 1"
  const candidateBlocks = blocks.length > 0 ? blocks : text.split(/(?:^|\n+)(?:QUESTÃO\s*\d+|Q\d+|\d+[\.\-\)])/i)
    .map(b => b.trim())
    .filter(b => b.length > 15)

  const parsedList = []

  for (let idx = 0; idx < candidateBlocks.length; idx++) {
    const rawBlock = candidateBlocks[idx]
    const lines = rawBlock.split('\n').map(l => l.trim())

    let year = null
    let subjectName = ''
    let difficulty = ''
    let correctAnswer = 'A'
    let explanation = ''
    let imageUrl = ''
    let statementLines = []
    const optionsMap = { A: '', B: '', C: '', D: '', E: '' }

    let currentSection = 'statement'

    for (const line of lines) {
      if (!line) {
        if (currentSection === 'statement') statementLines.push('')
        continue
      }

      // Metadados com chaves no início da linha
      const matchYear = line.match(/^(?:ANO|YEAR)\s*[:=]\s*(\d{4})/i)
      if (matchYear) {
        year = Number(matchYear[1])
        continue
      }

      const matchSubject = line.match(/^(?:MATERIA|MATÉRIA|DISCIPLINA|SUBJECT)\s*[:=]\s*(.+)$/i)
      if (matchSubject) {
        subjectName = matchSubject[1].trim()
        continue
      }

      const matchDiff = line.match(/^(?:DIFICULDADE|DIFFICULTY|NIVEL|NÍVEL)\s*[:=]\s*(.+)$/i)
      if (matchDiff) {
        const val = matchDiff[1].toUpperCase()
        if (val.includes('FAC') || val.includes('EASY')) difficulty = 'EASY'
        else if (val.includes('DIF') || val.includes('HARD')) difficulty = 'HARD'
        else difficulty = 'MEDIUM'
        continue
      }

      const matchGabarito = line.match(/^(?:GABARITO|RESPOSTA|CORRETA|ANSWER)\s*[:=]\s*([A-Ea-e])/i)
      if (matchGabarito) {
        correctAnswer = matchGabarito[1].toUpperCase()
        continue
      }

      const matchImg = line.match(/^(?:IMAGEM|IMAGE|FIGURA|IMG)\s*[:=]\s*(https?:\/\/[^\s]+)/i)
      if (matchImg) {
        imageUrl = matchImg[1].trim()
        continue
      }

      const matchExpl = line.match(/^(?:EXPLICACAO|EXPLICAÇÃO|RESOLUCAO|RESOLUÇÃO|COMENTARIO|COMENTÁRIO)\s*[:=]\s*(.*)$/i)
      if (matchExpl) {
        currentSection = 'explanation'
        if (matchExpl[1]) explanation += matchExpl[1] + '\n'
        continue
      }

      // Alternativas: A), B), C), D), E) ou A., B., C., D., E. ou (A), (B), (C), (D), (E)
      const matchOpt = line.match(/^(?:\(?\s*([A-Ea-e])\s*[\)\.\-:]|\b([A-Ea-e])\s*[\)\.\-])\s*(.*)$/)
      if (matchOpt) {
        const letter = (matchOpt[1] || matchOpt[2]).toUpperCase()
        currentSection = letter
        optionsMap[letter] = matchOpt[3] || ''
        continue
      }

      // Conteúdo continuado
      if (['A', 'B', 'C', 'D', 'E'].includes(currentSection)) {
        optionsMap[currentSection] += (optionsMap[currentSection] ? ' ' : '') + line
      } else if (currentSection === 'explanation') {
        explanation += (explanation ? ' ' : '') + line
      } else {
        statementLines.push(line)
      }
    }

    const statement = statementLines.join('\n').trim()

    // Converte opções
    const options = ['A', 'B', 'C', 'D', 'E'].map(letter => ({
      letter,
      text: (optionsMap[letter] || '').trim()
    }))

    const validOptionsCount = options.filter(o => o.text.length > 0).length

    parsedList.push({
      id: `txt-preview-${idx + 1}`,
      statement: statement || `Questão #${idx + 1}`,
      year: year || defaultYear.value || new Date().getFullYear(),
      subjectName: subjectName || '',
      difficulty: difficulty || defaultDifficulty.value || 'MEDIUM',
      correctAnswer: correctAnswer || 'A',
      explanation: explanation.trim(),
      imageUrl: imageUrl.trim() || null,
      options,
      hasStatement: statement.length > 10,
      validOptionsCount,
      isValid: statement.length > 10 && validOptionsCount >= 2
    })
  }

  return parsedList
}

function parseJsonQuestions(jsonStr) {
  if (!jsonStr || !jsonStr.trim()) return []

  try {
    let raw = JSON.parse(jsonStr)
    if (!Array.isArray(raw)) {
      if (raw && typeof raw === 'object') {
        raw = raw.questions || raw.questoes || raw.data || [raw]
      } else {
        return []
      }
    }

    return raw.map((item, idx) => {
      const statement = item.statement || item.enunciado || item.texto || item.question || ''
      const year = Number(item.year || item.ano || defaultYear.value || new Date().getFullYear())
      const subjectName = item.subjectName || item.materia || item.disciplina || item.subject || ''
      const subjectId = item.subjectId || item.materiaId || ''

      let difficulty = 'MEDIUM'
      const rawDiff = String(item.difficulty || item.dificuldade || defaultDifficulty.value).toUpperCase()
      if (rawDiff.includes('EASY') || rawDiff.includes('FAC')) difficulty = 'EASY'
      else if (rawDiff.includes('HARD') || rawDiff.includes('DIF')) difficulty = 'HARD'

      const correctAnswer = String(item.correctAnswer || item.gabarito || item.resposta || 'A').toUpperCase().trim()

      const rawOptions = item.options || item.alternativas || []
      let options = []
      if (Array.isArray(rawOptions)) {
        const letters = ['A', 'B', 'C', 'D', 'E']
        options = letters.map((letter, i) => {
          const opt = rawOptions[i] || rawOptions.find(o => String(o.letter || '').toUpperCase() === letter)
          return {
            letter,
            text: typeof opt === 'string' ? opt : (opt?.text || opt?.texto || '')
          }
        })
      } else if (rawOptions && typeof rawOptions === 'object') {
        options = ['A', 'B', 'C', 'D', 'E'].map(letter => ({
          letter,
          text: String(rawOptions[letter] || rawOptions[letter.toLowerCase()] || '')
        }))
      } else {
        options = ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: '' }))
      }

      const validOptionsCount = options.filter(o => o.text && o.text.trim().length > 0).length

      return {
        id: `json-preview-${idx + 1}`,
        statement: String(statement).trim(),
        year,
        subjectId,
        subjectName,
        difficulty,
        correctAnswer: ['A', 'B', 'C', 'D', 'E'].includes(correctAnswer) ? correctAnswer : 'A',
        explanation: String(item.explanation || item.explicacao || item.resolucao || '').trim(),
        imageUrl: item.imageUrl || item.imagem || null,
        options,
        hasStatement: statement.length > 5,
        validOptionsCount,
        isValid: statement.length > 5 && validOptionsCount >= 2
      }
    })
  } catch (err) {
    return []
  }
}

// Lista dinâmica das questões pré-visualizadas com suporte a exclusão individual
const excludedIds = ref(new Set())

watch([rawInput, inputFormat], () => {
  excludedIds.value = new Set()
})

const parsedQuestions = computed(() => {
  const base = inputFormat.value === 'TXT'
    ? parseTxtQuestions(rawInput.value)
    : parseJsonQuestions(rawInput.value)
  return base.filter(q => !excludedIds.value.has(q.id))
})

const validQuestionsCount = computed(() => parsedQuestions.value.filter(q => q.isValid).length)
const invalidQuestionsCount = computed(() => parsedQuestions.value.filter(q => !q.isValid).length)

// Remove questão individual da pré-visualização
function removeParsedQuestion(id) {
  const newSet = new Set(excludedIds.value)
  newSet.add(id)
  excludedIds.value = newSet
}

function resolveSubjectLabel(q) {
  if (q.subjectName) return q.subjectName
  if (q.subjectId) {
    const found = props.subjects.find(s => s.id === q.subjectId)
    if (found) return found.name
  }
  if (defaultSubjectId.value) {
    const found = props.subjects.find(s => s.id === defaultSubjectId.value)
    if (found) return found.name
  }
  return 'Matéria Padrão'
}

function getDifficultyMeta(diff) {
  const norm = String(diff || 'MEDIUM').toUpperCase()
  if (norm === 'EASY') return { label: 'Fácil', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' }
  if (norm === 'HARD') return { label: 'Difícil', class: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' }
  return { label: 'Média', class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' }
}

async function handleSaveAll() {
  const toSend = parsedQuestions.value.filter(q => q.isValid).map(q => {
    // Resolve matéria final
    let subjectId = q.subjectId
    if (!subjectId && q.subjectName) {
      const match = props.subjects.find(s =>
        s.name.toLowerCase() === q.subjectName.toLowerCase() ||
        s.slug.toLowerCase() === q.subjectName.toLowerCase()
      )
      if (match) subjectId = match.id
    }
    if (!subjectId) subjectId = defaultSubjectId.value || props.subjects?.[0]?.id || ''

    return {
      statement: q.statement,
      year: q.year || defaultYear.value,
      difficulty: q.difficulty || defaultDifficulty.value,
      subjectId,
      subjectName: q.subjectName,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || null,
      imageUrl: q.imageUrl || null,
      options: q.options
    }
  })

  if (toSend.length === 0) {
    saveErrorMessage.value = 'Nenhuma questão válida pronta para ser adicionada.'
    return
  }

  saving.value = true
  saveSuccessMessage.value = ''
  saveErrorMessage.value = ''

  try {
    const res = await $fetch('/api/admin/questions/import-batch', {
      method: 'POST',
      body: { questions: toSend },
      credentials: 'include'
    })

    saveSuccessMessage.value = `${res.importedCount} questão(ões) adicionada(s) ao banco com sucesso!`
    setTimeout(() => {
      emit('imported')
      emit('close')
      rawInput.value = ''
      saveSuccessMessage.value = ''
    }, 2000)
  } catch (err) {
    saveErrorMessage.value = err?.data?.statusMessage || err?.message || 'Erro ao salvar questões.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/70 backdrop-blur-sm transition-all"
    @click.self="$emit('close')"
  >
    <div class="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden my-auto">
      
      <!-- HEADER -->
      <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4.5 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <span class="material-symbols-rounded text-2xl">post_add</span>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Adicionar Questões em TXT ou JSON
              <span class="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Lote com Pré-visualização
              </span>
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              Cole ou carregue um arquivo. Veja os cards formatados em tempo real antes de salvar no banco.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          @click="$emit('close')"
        >
          <span class="material-symbols-rounded text-xl">close</span>
        </button>
      </div>

      <!-- CORPO COM DUAS COLUNAS (EDITOR E PREVIEW) -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

        <!-- BARRA DE FILTROS GLOBAIS / PADRÃO -->
        <div class="p-4 rounded-2xl border border-purple-100 dark:border-purple-950/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <span class="material-symbols-rounded text-base">tune</span>
              Filtros Padrão (Aplicados caso a questão não informe ano/matéria no texto)
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- ANO PADRÃO -->
            <div>
              <label class="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Ano do ENEM Padrão
              </label>
              <input
                v-model.number="defaultYear"
                type="number"
                min="1998"
                max="2035"
                class="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <!-- MATÉRIA PADRÃO -->
            <div>
              <label class="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Matéria Padrão
              </label>
              <select
                v-model="defaultSubjectId"
                class="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option v-for="s in subjects" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <!-- DIFICULDADE PADRÃO -->
            <div>
              <label class="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                Dificuldade Padrão
              </label>
              <select
                v-model="defaultDifficulty"
                class="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="EASY">Fácil (EASY)</option>
                <option value="MEDIUM">Média (MEDIUM)</option>
                <option value="HARD">Difícil (HARD)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- LAYOUT SPLIT: ESQUERDA (EDITOR TXT/JSON) E DIREITA (PREVIEW DOS CARDS) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          <!-- COLUNA 1: ENTRADA TXT OU JSON -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <!-- SELECTOR DE FORMATO -->
              <div class="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold">
                <button
                  type="button"
                  @click="inputFormat = 'TXT'"
                  class="px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                  :class="inputFormat === 'TXT' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs font-black' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'"
                >
                  Formato TXT (Texto)
                </button>
                <button
                  type="button"
                  @click="inputFormat = 'JSON'"
                  class="px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                  :class="inputFormat === 'JSON' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-2xs font-black' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'"
                >
                  Formato JSON
                </button>
              </div>

              <!-- AÇÕES RÁPIDAS: ARQUIVO E EXEMPLO -->
              <div class="flex items-center gap-2">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".txt,.json"
                  class="hidden"
                  @change="handleFileUpload"
                />

                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:border-purple-400 transition cursor-pointer"
                  @click="fileInputRef.click()"
                >
                  <span class="material-symbols-rounded text-sm">upload_file</span>
                  <span>Carregar Arquivo</span>
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition cursor-pointer"
                  @click="loadExample"
                >
                  <span class="material-symbols-rounded text-sm">auto_fix_high</span>
                  <span>Ver Exemplo {{ inputFormat }}</span>
                </button>
              </div>
            </div>

            <!-- TEXTAREA DO CÓDIGO/TEXTO -->
            <div class="relative">
              <textarea
                v-model="rawInput"
                rows="18"
                class="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                :placeholder="placeholderText"
              ></textarea>

              <button
                v-if="rawInput"
                type="button"
                class="absolute top-3 right-3 text-zinc-400 hover:text-red-500 p-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 transition cursor-pointer"
                title="Limpar texto"
                @click="rawInput = ''"
              >
                <span class="material-symbols-rounded text-sm">delete</span>
              </button>
            </div>

            <!-- DICAS DE FORMATAÇÃO RÁPIDA -->
            <div class="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
              <p v-if="inputFormat === 'TXT'">
                <strong>Dica TXT:</strong> Separe as questões com <code>---</code> ou <code>[QUESTAO]</code>. Você pode definir <code>ANO: 2024</code>, <code>MATERIA: Biologia</code>, <code>DIFICULDADE: FACIL</code>, <code>GABARITO: C</code> e alternativas iniciando por <code>A)</code>, <code>B)</code>, etc.
              </p>
              <p v-else>
                <strong>Dica JSON:</strong> Aceita chaves em português (<code>enunciado</code>, <code>gabarito</code>, <code>ano</code>, <code>alternativas</code>) ou em inglês (<code>statement</code>, <code>correctAnswer</code>, <code>year</code>, <code>options</code>).
              </p>
            </div>
          </div>

          <!-- COLUNA 2: PRÉ-VISUALIZAÇÃO DOS CARDS EM TEMPO REAL -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span class="material-symbols-rounded text-base">visibility</span>
                  Pré-visualização dos Cards
                </span>
                <span
                  v-if="parsedQuestions.length > 0"
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-black"
                  :class="validQuestionsCount > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'"
                >
                  {{ validQuestionsCount }} pronta(s)
                  <span v-if="invalidQuestionsCount > 0">• {{ invalidQuestionsCount }} com aviso</span>
                </span>
              </div>

              <span class="text-[11px] text-zinc-400 font-medium">
                Mostrando como os alunos verão
              </span>
            </div>

            <!-- CONTAINER DE SCROLL DOS CARDS -->
            <div class="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              <!-- ESTADO VAZIO -->
              <div
                v-if="parsedQuestions.length === 0"
                class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30"
              >
                <div class="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                  <span class="material-symbols-rounded text-2xl">style</span>
                </div>
                <h4 class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Nenhum card identificado ainda</h4>
                <p class="text-[11px] text-zinc-400 max-w-xs mt-1">
                  Digite ou cole o texto/JSON ao lado ou clique em <strong>"Ver Exemplo {{ inputFormat }}"</strong> para ver os cards aparecerem aqui em tempo real.
                </p>
              </div>

              <!-- LISTAGEM DOS CARDS GERADOS -->
              <div
                v-for="(card, cardIdx) in parsedQuestions"
                :key="card.id || cardIdx"
                class="rounded-2xl border bg-white dark:bg-zinc-900 p-4.5 space-y-3.5 shadow-2xs transition-all relative group"
                :class="card.isValid ? 'border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800' : 'border-red-300 dark:border-red-900 bg-red-50/20'"
              >
                <!-- TOP BAR DO CARD -->
                <div class="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <!-- BADGE NÚMERO -->
                    <span class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                      #{{ cardIdx + 1 }}
                    </span>

                    <!-- MATÉRIA -->
                    <span class="rounded-lg bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 px-2.5 py-0.5 text-[10px] font-bold">
                      {{ resolveSubjectLabel(card) }}
                    </span>

                    <!-- ANO -->
                    <span class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                      ENEM {{ card.year }}
                    </span>

                    <!-- DIFICULDADE -->
                    <span
                      class="rounded-lg px-2 py-0.5 text-[10px] font-bold border"
                      :class="getDifficultyMeta(card.difficulty).class"
                    >
                      {{ getDifficultyMeta(card.difficulty).label }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <!-- STATUS DE VALIDAÇÃO -->
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                      :class="card.isValid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'"
                    >
                      <span class="material-symbols-rounded text-xs">{{ card.isValid ? 'check_circle' : 'warning' }}</span>
                      {{ card.isValid ? 'Válida' : 'Incompleta' }}
                    </span>

                    <!-- BOTÃO REMOVER DO LOTE -->
                    <button
                      type="button"
                      class="text-zinc-400 hover:text-red-500 p-1 rounded-lg transition cursor-pointer"
                      title="Remover esta questão do lote"
                      @click="removeParsedQuestion(card.id)"
                    >
                      <span class="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                </div>

                <!-- ENUNCIADO -->
                <div>
                  <p class="text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-line leading-relaxed">
                    {{ card.statement }}
                  </p>

                  <!-- IMAGEM SE HOUVER -->
                  <div v-if="card.imageUrl" class="mt-2.5">
                    <img
                      :src="card.imageUrl"
                      alt="Imagem da questão"
                      class="max-h-48 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain p-1 bg-white dark:bg-zinc-950"
                    />
                  </div>
                </div>

                <!-- ALTERNATIVAS A, B, C, D, E -->
                <div class="space-y-1.5 pt-1">
                  <div
                    v-for="opt in card.options"
                    :key="opt.letter"
                    class="flex items-start gap-2.5 p-2 rounded-xl border text-xs transition"
                    :class="opt.letter === card.correctAnswer
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 text-zinc-700 dark:text-zinc-300'"
                  >
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                      :class="opt.letter === card.correctAnswer
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'"
                    >
                      {{ opt.letter }}
                    </span>

                    <span class="flex-1 leading-snug">
                      {{ opt.text || '(Alternativa vazia)' }}
                    </span>

                    <span v-if="opt.letter === card.correctAnswer" class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                      <span class="material-symbols-rounded text-xs">check</span>
                      Gabarito
                    </span>
                  </div>
                </div>

                <!-- RESOLUÇÃO COMENTADA SE HOUVER -->
                <div v-if="card.explanation" class="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-[11px] space-y-1">
                  <span class="font-black text-purple-900 dark:text-purple-300 flex items-center gap-1">
                    <span class="material-symbols-rounded text-xs">lightbulb</span>
                    Resolução Comentada:
                  </span>
                  <p class="text-purple-800 dark:text-purple-200 leading-relaxed">
                    {{ card.explanation }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MENSAGENS DE SUCESSO / ERRO -->
        <div
          v-if="saveSuccessMessage"
          class="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <span class="material-symbols-rounded">check_circle</span>
          <span>{{ saveSuccessMessage }}</span>
        </div>

        <div
          v-if="saveErrorMessage"
          class="p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 text-xs font-bold flex items-center gap-2"
        >
          <span class="material-symbols-rounded">error</span>
          <span>{{ saveErrorMessage }}</span>
        </div>
      </div>

      <!-- FOOTER / BOTÕES DE SALVAMENTO -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/70 dark:bg-zinc-950/40">
        <div class="text-xs text-zinc-500 dark:text-zinc-400">
          Total de questões identificadas: <strong class="text-zinc-900 dark:text-zinc-100">{{ parsedQuestions.length }}</strong>
          <span v-if="validQuestionsCount > 0" class="text-emerald-600 dark:text-emerald-400 font-bold ml-1.5">
            ({{ validQuestionsCount }} pronta(s) para inclusão)
          </span>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            @click="$emit('close')"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="validQuestionsCount === 0 || saving"
            class="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            @click="handleSaveAll"
          >
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span class="material-symbols-rounded text-sm" v-else>save</span>
            <span>
              {{ saving ? 'Salvando no banco...' : `Salvar ${validQuestionsCount} Questão(ões) no Banco` }}
            </span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
