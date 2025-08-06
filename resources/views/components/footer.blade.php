@php use App\View\Components\footer; @endphp
<footer class="bg-text-page py-8 px-6 text-white">
    <article class="xs:grid xs:grid-cols-2 lg:flex lg:flex-row lg:flex-wrap gap-8 lg:gap-x-32 gap-y-8">
        <div class="logo-container grid justify-items-start">
            <h2 class="text-5xl font-dancing font-bold">Ania</h2>
            <p class="max-w-[30ch] mt-6 text-sm normal-text leading-8">
                {{footer::SLOGAN}}
            </p>
        </div>

        <article>
            <h3 class="text-white font-bold text-xl">Productos</h3>
            <ul class="mt-3 *:my-2 normal-text">
                <li><a href="">Piñatas</a></li>
                <li><a href="">Adornos</a></li>
                <li><a href="">Papelería creativa</a></li>
                <li><a href="">Cajas sorpresa</a></li>
            </ul>
        </article>
        <article>
            <h3 class="text-white font-bold text-xl">Servicios</h3>
            <ul class="mt-3 *:my-2 normal-text">
                <li><a href="">Ramos florales y artificiales</a></li>
                <li><a href="">Desayunos</a></li>
                <li><a href="">Fotos polaroid</a></li>
            </ul>
        </article>
        <article>
            <h3 class="text-white font-bold text-xl">Información importante</h3>
            <ul class="mt-3 *:my-2 normal-text">
                <li><a href="">Política de pedidos</a></li>
                <li><a href="">Política de privacidad</a></li>
            </ul>
        </article>

        <article>
            <h3 class="text-white font-bold text-xl">Contacto</h3>
            <ul class="mt-3 *:my-2 normal-text">
                <li><a href="">Facebook</a></li>
                <li><a href="">Atliaca, Gro.</a></li>
            </ul>
        </article>
        <article>
            <h3 class="text-white font-bold text-xl">Síguenos</h3>
            <ul class="mt-3 *:my-2 normal-text">
                <li><a href="">Facebook</a></li>
                <li><a href="">TikTok</a></li>
            </ul>
        </article>
    </article>
    <div class="border-b-1 w-full opacity-60 mt-4 rounded-2xl">

    </div>
</footer>
