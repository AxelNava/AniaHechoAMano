<x-main-container :has-header="false">
    <x-slot:header>
    </x-slot>
    <main class="grid md:grid-cols-2">
        <aside>
            <nav class="filter-parent">
                <ul>
                    <li>Color primario</li>
                    <li>Costo</li>
                </ul>
                <ul>
                    <li><label for="piniatas"><input type="checkbox" name="piñatas" id="piniatas">Piñatas</label></li>
                    <li>Adornos</li>
                    <li>Gelatinas y otros postres</li>
                    <li>Ramos florales</li>
                    <li>Papelería creativa</li>
                    <li>Desayunos sorpresa</li>
                    <li>Impresión de fotos polaroid</li>
                    <li>Cajas sorpresa</li>
                </ul>
            </nav>
        </aside>
        <section>
            <x-product-preview product-name="piñata" product-id="8" description="pequeña descripción" price="100" image-direction="/ruta/para/imagen">

            </x-product-preview>

            <x-product-preview product-name="piñata" product-id="9" description="pequeña descripción" price="100" image-direction="/ruta/para/imagen">

            </x-product-preview>
        </section>
    </main>
</x-main-container>
