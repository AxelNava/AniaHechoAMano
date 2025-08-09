<nav class="max-lg:relative max-lg:h-22 ">
    <ul class="max-lg:absolute max-lg:grid-cols-[auto_auto_auto] max-lg:grid-rows-3 grid max-lg:inset-x-10 max-sm:inset-x-0 max-sm:px-0 max-sm:gap-x-2 max-sm:*:*:text-[0.5rem] max-sm:*:*:px-2 lg:grid-flow-col gap-2 justify-items-center justify-center py-4 navigation-buttons transition-transform">
        <li>
            <x-primary-button href="" selected>Piñatas</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Adornos</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Gelatinas y postres</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Ramos florales</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Papelería creativa</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Desayunos sorpresa</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Fotos polaroid</x-primary-button>
        </li>
        <li>
            <x-primary-button href="">Cajas sorpresa</x-primary-button>
        </li>
        <li>
            <input type="checkbox" id="others" class="hidden checkbox-other">
            <label for="others" class="button-others lg:hidden text-text-page text-center border-2 border-secondary font-sans-serif text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1">Otros</label>
        </li>
        {{--        <li>buscar</li>--}}
    </ul>
</nav>

<script>
   let inputCheckOther = document.querySelector(".checkbox-other")
   let navigationUl=document.querySelector(".navigation-buttons")
   if(inputCheckOther !== null){
       if(inputCheckOther.checked){
       }
   }
</script>
