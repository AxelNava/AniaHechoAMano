<nav class="max-lg:relative">
    <ul class="max-lg:bg-white max-sm:px-2 max-lg:absolute max-lg:grid-cols-[auto_auto_auto] grid max-lg:w-[100dvw] max-sm:gap-x-2 max-sm:*:*:text-[0.75rem] max-sm:*:*:px-2 lg:grid-flow-col max-lg:gap-y-8 lg:gap-4 justify-items-center items-center justify-center py-4 navigation-buttons transition-transform">
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
            <x-primary-button href="" class="last">Fotos polaroid</x-primary-button>
        </li>
        <li>
            <x-primary-button href="" class="last">Cajas sorpresa</x-primary-button>
        </li>
        <li>
            <input type="checkbox" id="others" class="hidden checkbox-other">
            <label for="others"
                   class="last button-others lg:hidden text-text-page text-center border-2 border-secondary font-sans-serif text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1">Otros</label>
        </li>
        {{--        <li>buscar</li>--}}
    </ul>
</nav>

<script>
    let inputCheckOther = document.querySelector(".checkbox-other")
    let navigationUl = document.querySelector(".navigation-buttons")
    let lastRowGrid = document.querySelectorAll(".navigation-buttons .last")
    if(lastRowGrid !== null){
        let parentsElementList = lastRowGrid.entries().map((element) => element.parent)

    }
    if (inputCheckOther !== null) {
        if (inputCheckOther.checked) {
        } else {
            lastRowGrid.forEach((element)=>
            {
                // element.style.cssText='margin-bottom:2rem;'
                console.log(element)
            })
            // navigationUl.style.cssText = 'transform:translateY(-18dvh);'
            console.log(lastRowGrid)

        }
    }
</script>
