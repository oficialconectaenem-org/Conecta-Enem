<script setup>

import { useSubjects } from '~/composables/useSubjects'
import { useModules } from '~/composables/useModules'


definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})


useSeoMeta({
  title: 'Gerenciar matéria — Conecta Enem'
})


const route = useRoute()


const {
  getSubject
} = useSubjects()


const {
  getModules,
  updateModule,
  deleteModule
} = useModules()



const subject = ref(null)

const modules = ref([])

const loading = ref(true)

const error = ref('')


const updatingId = ref(null)

const deletingId = ref(null)



async function loadData() {

  loading.value = true

  error.value = ''


  try {


    const [
      subjectResponse,
      modulesResponse
    ] = await Promise.all([

      getSubject(route.params.id),

      getModules(route.params.id)

    ])



    subject.value =
      subjectResponse.subject



    modules.value =
      modulesResponse.modules || []


  }

  catch(err) {


    console.error(
      'Erro ao carregar matéria:',
      err
    )


    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível carregar a matéria.'


  }

  finally {

    loading.value = false

  }

}





async function toggleModule(module) {


  if(updatingId.value){

    return

  }


  updatingId.value =
    module.id


  error.value = ''



  try {


    const response =
      await updateModule(

        module.id,

        {

          subjectId:
            route.params.id,

          name:
            module.name,

          description:
            module.description,

          order:
            module.order,

          active:
            !module.active

        }

      )



    const index =
      modules.value.findIndex(
        item =>
          item.id === module.id
      )



    if(index !== -1){

      modules.value[index] =
        response.module

    }


  }

  catch(err){


    console.error(
      'Erro ao alterar módulo:',
      err
    )


    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível alterar o módulo.'


  }

  finally {


    updatingId.value = null


  }


}





async function removeModule(module) {


  const confirmed =
    window.confirm(
      `Deseja realmente excluir o módulo "${module.name}"?`
    )


  if(!confirmed){

    return

  }



  deletingId.value =
    module.id


  error.value = ''



  try {


    await deleteModule(
      module.id
    )


    modules.value =
      modules.value.filter(

        item =>
          item.id !== module.id

      )


  }

  catch(err){


    console.error(
      'Erro ao excluir módulo:',
      err
    )


    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível excluir o módulo.'


  }

  finally {


    deletingId.value = null


  }


}





onMounted(() => {

  loadData()

})


</script>



<template>


<div class="space-y-6">


<NuxtLink

to="/admin/materias"

class="inline-flex text-sm font-bold text-[#7C3AED] transition hover:text-[#5B21B6]"

>

← Voltar para matérias

</NuxtLink>




<div
v-if="error"
class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
>

{{ error }}

</div>





<div
v-if="loading"
class="rounded-2xl border border-zinc-200 bg-white p-10 text-center"
>

<p class="font-semibold text-zinc-500">

Carregando matéria...

</p>

</div>





<template v-else-if="subject">





<section
class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
>


<h1 class="text-3xl font-black text-zinc-900">

{{ subject.name }}

</h1>


<p class="mt-2 text-sm text-zinc-500">

{{ subject.description || 'Sem descrição' }}

</p>


</section>







<section
class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
>


<div class="flex items-center justify-between">


<div>

<h2 class="text-xl font-black text-zinc-900">

Módulos

</h2>


<p class="text-sm text-zinc-500">

Gerencie os módulos de {{ subject.name }}

</p>

</div>



<NuxtLink

:to="`/admin/materias/${subject.id}/modulos/novo`"

class="rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white"

>

+ Novo módulo

</NuxtLink>


</div>







<div
class="mt-6 space-y-4"
>


<article

v-for="module in modules"

:key="module.id"

class="rounded-2xl border border-zinc-200 p-5"

>


<div class="flex justify-between items-center">


<div>


<h3 class="text-lg font-black">

{{ module.order }} -
{{ module.name }}

</h3>


<p class="text-sm text-zinc-500">

{{ module.description || 'Sem descrição' }}

</p>


</div>





<div class="flex gap-2">



<!-- AQUI ESTÁ A ALTERAÇÃO -->

<NuxtLink

:to="`/admin/modulos/${module.id}`"

class="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white"

>

Ver aulas

</NuxtLink>





<NuxtLink

:to="`/admin/materias/${subject.id}/modulos/${module.id}/editar`"

class="rounded-lg border px-4 py-2 text-xs font-bold"

>

Editar

</NuxtLink>





<button

@click="toggleModule(module)"

class="rounded-lg border px-4 py-2 text-xs font-bold"

>

{{ module.active ? 'Desativar' : 'Ativar' }}

</button>





<button

@click="removeModule(module)"

class="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600"

>

Excluir

</button>



</div>


</div>


</article>


</div>


</section>



</template>



</div>


</template>