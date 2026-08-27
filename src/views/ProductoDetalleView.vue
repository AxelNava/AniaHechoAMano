<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import ProductLayout from "@/layouts/ProductLayout.vue";
import ProductImagesManager from "@/components/dashboard/products/ProductImagesManager.vue";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ProductApi,
  resolveProductBinaryUrl,
  resolveProductImageUrl,
} from "@/services/products/productApi";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import defaultProductImage from "@/assets/images/default-product.jpg";
import { formatCurrency } from "@/utils/orderDisplay";
import type { ProductDto, ProductImageDto, ProductImageItem } from "@/types/products/ProductDto";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";

type ModoPedido = "tal_cual" | "modificacion";
type RegistroDesconocido = Record<string, unknown>;

const mensajeNoDisponible = "No podemos agregar este producto a tu pedido en este momento.";

const esRegistro = (valor: unknown): valor is RegistroDesconocido =>
  typeof valor === "object" && valor !== null;

const esIdValido = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isSafeInteger(valor) && valor > 0;

const esNumeroNoNegativo = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

const esTextoConContenido = (valor: unknown): valor is string =>
  typeof valor === "string" && valor.trim().length > 0;

const esImagenProductoValida = (valor: unknown): valor is ProductImageDto => {
  if (!esRegistro(valor)) return false;

  const tieneFuente =
    (typeof valor.url === "string" && valor.url.trim().length > 0) ||
    (typeof valor.binario_url === "string" && valor.binario_url.trim().length > 0);

  return (
    tieneFuente &&
    (valor.id === undefined || esIdValido(valor.id)) &&
    esNumeroNoNegativo(valor.orden) &&
    (valor.alt === undefined || typeof valor.alt === "string")
  );
};

const esProductoValido = (valor: unknown): valor is ProductDto => {
  if (!esRegistro(valor)) return false;

  return (
    esIdValido(valor.id) &&
    esTextoConContenido(valor.nombre) &&
    esNumeroNoNegativo(valor.precio_base) &&
    esIdValido(valor.categoria_id) &&
    (valor.descripcion === undefined || typeof valor.descripcion === "string") &&
    (valor.activo === undefined || typeof valor.activo === "boolean") &&
    typeof valor.permite_modificaciones === "boolean" &&
    typeof valor.requiere_anticipo === "boolean" &&
    Array.isArray(valor.componentes) &&
    (valor.imagenes === undefined ||
      (Array.isArray(valor.imagenes) && valor.imagenes.every(esImagenProductoValida)))
  );
};

const esInfoPedidoValida = (valor: unknown): valor is ProductoInfoPedidoDto => {
  if (!esRegistro(valor)) return false;

  return (
    esIdValido(valor.id) &&
    esTextoConContenido(valor.nombre) &&
    typeof valor.descripcion === "string" &&
    esNumeroNoNegativo(valor.precio_base) &&
    (valor.categoria_id === null || esIdValido(valor.categoria_id)) &&
    esTextoConContenido(valor.categoria) &&
    typeof valor.permite_modificaciones === "boolean" &&
    typeof valor.requiere_anticipo === "boolean" &&
    esNumeroNoNegativo(valor.tiempo_total_estimado_minutos) &&
    Array.isArray(valor.componentes)
  );
};

const route = useRoute();
const router = useRouter();
const productApi = new ProductApi();
const cliente = usePedidoCliente();

const slug = computed(() => String(route.params.slug ?? ""));
const productId = computed<number | null>(() => {
  const rawId = route.params.id;
  if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId)) return null;

  const id = Number(rawId);
  return esIdValido(id) ? id : null;
});

const producto = ref<ProductDto | null>(null);
const info = ref<ProductoInfoPedidoDto | null>(null);
const cargando = ref(true);
const errorCarga = ref("");

const modo = ref<ModoPedido>("tal_cual");
const descripcionModificacion = ref("");
const fotos = ref<ProductImageItem[]>([]);
const imagenActiva = ref(0);
const enviando = ref(false);
let solicitudDeCarga = 0;

const permiteModificaciones = computed(
  () => producto.value?.permite_modificaciones ?? info.value?.permite_modificaciones ?? false,
);
const requiereAnticipo = computed(
  () => producto.value?.requiere_anticipo ?? info.value?.requiere_anticipo ?? false,
);
const precioBase = computed(() => info.value?.precio_base ?? null);
const precioBaseFormateado = computed(() =>
  precioBase.value === null ? "" : formatCurrency(precioBase.value),
);
const descripcion = computed(
  () => info.value?.descripcion?.trim() || producto.value?.descripcion?.trim() || "",
);

const imagenes = computed<ProductImageDto[]>(() =>
  [...(producto.value?.imagenes ?? [])].sort((a, b) => a.orden - b.orden),
);
const indiceImagenActiva = computed(() =>
  Math.min(Math.max(imagenActiva.value, 0), Math.max(imagenes.value.length - 1, 0)),
);

const resolverImagen = (imagen: ProductImageDto): string => {
  if (imagen.binario_url) return resolveProductBinaryUrl(imagen.binario_url);
  if (imagen.url) return resolveProductImageUrl(imagen.url);
  return defaultProductImage;
};

const nombreImagen = (imagen: ProductImageDto, indice: number): string =>
  imagen.alt?.trim() ||
  `${producto.value?.nombre ?? info.value?.nombre ?? "Producto"}, imagen ${indice + 1}`;

const imagenPrincipal = computed(() => {
  const imagen = imagenes.value[indiceImagenActiva.value];
  return imagen ? resolverImagen(imagen) : defaultProductImage;
});
const textoAlternativoImagenPrincipal = computed(() => {
  const imagen = imagenes.value[indiceImagenActiva.value];
  return imagen
    ? nombreImagen(imagen, indiceImagenActiva.value)
    : (producto.value?.nombre ?? info.value?.nombre ?? "Producto");
});

const esModificacion = computed(() => permiteModificaciones.value && modo.value === "modificacion");

const limpiarFicha = () => {
  producto.value = null;
  info.value = null;
  imagenActiva.value = 0;
  errorCarga.value = "";
};

const cargarProducto = async () => {
  const solicitudActual = ++solicitudDeCarga;
  cargando.value = true;
  limpiarFicha();

  const id = productId.value;
  if (!esIdValido(id)) {
    errorCarga.value = mensajeNoDisponible;
    cargando.value = false;
    return;
  }

  try {
    const [detalle, ordenInfo] = await Promise.all([
      productApi.getProductById(id),
      productApi.getProductOrderInfo(id),
    ]);

    if (solicitudActual !== solicitudDeCarga) return;

    if (
      !esProductoValido(detalle) ||
      !esInfoPedidoValida(ordenInfo) ||
      detalle.id !== id ||
      ordenInfo.id !== id ||
      detalle.id !== ordenInfo.id ||
      detalle.activo === false
    ) {
      errorCarga.value = mensajeNoDisponible;
      return;
    }

    producto.value = detalle;
    info.value = ordenInfo;
    if (!permiteModificaciones.value) modo.value = "tal_cual";
  } catch {
    if (solicitudActual === solicitudDeCarga) errorCarga.value = mensajeNoDisponible;
  } finally {
    if (solicitudActual === solicitudDeCarga) cargando.value = false;
  }
};

const onModo = (valor: unknown) => {
  modo.value = valor === "modificacion" ? "modificacion" : "tal_cual";
};

const seleccionarImagen = (indice: number) => {
  if (indice >= 0 && indice < imagenes.value.length) imagenActiva.value = indice;
};

watch(productId, cargarProducto, { immediate: true });

const solicitar = () => {
  if (enviando.value) return;

  const detalle = producto.value;
  const ordenInfo = info.value;
  if (
    !esProductoValido(detalle) ||
    !esInfoPedidoValida(ordenInfo) ||
    detalle.id !== productId.value ||
    ordenInfo.id !== productId.value ||
    detalle.id !== ordenInfo.id ||
    detalle.activo === false
  ) {
    toast.error(mensajeNoDisponible);
    return;
  }

  if (esModificacion.value && !descripcionModificacion.value.trim()) {
    toast.error("Describe la modificación que quieres para poder cotizarla.");
    return;
  }

  const archivos = esModificacion.value
    ? fotos.value.map((item) => item.file).filter((file): file is File => Boolean(file))
    : [];

  enviando.value = true;
  cliente.agregarLinea(ordenInfo, {
    esModificacion: esModificacion.value,
    descripcion: esModificacion.value ? descripcionModificacion.value : "",
    fotos: archivos,
  });

  toast.success(`"${ordenInfo.nombre}" agregado a tu pedido`);
  router.push("/pedido");
};
</script>

<template>
  <ProductLayout>
    <div
      v-if="cargando"
      class="py-24 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p class="text-text-page2 dark:text-primary-vue">Cargando producto...</p>
    </div>

    <div v-else-if="errorCarga" class="py-24 text-center">
      <div class="mx-auto max-w-xl rounded-2xl bg-primary-vue px-5 py-4 text-left" role="alert">
        <h1 class="text-text-page text-xl font-semibold">Producto no disponible</h1>
        <p class="text-text-page mt-2">{{ errorCarga }}</p>
      </div>
      <RouterLink
        :to="`/categoria/${slug}`"
        class="text-text-page mt-5 inline-flex font-medium underline decoration-secondary-vue decoration-2 underline-offset-4 hover:decoration-text-page focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-page dark:text-primary-vue dark:hover:decoration-primary-vue"
      >
        Volver al catálogo
      </RouterLink>
    </div>

    <article v-else class="py-6">
      <nav
        class="text-text-page2 mb-6 text-sm dark:text-primary-vue"
        aria-label="Navegación del producto"
      >
        <RouterLink
          :to="`/categoria/${slug}`"
          class="hover:text-text-page focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-page dark:hover:text-primary-vue"
        >
          ← Volver al catálogo
        </RouterLink>
      </nav>

      <div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section
          :aria-label="`Galería de imágenes de ${producto?.nombre ?? info?.nombre ?? 'producto'}`"
        >
          <div class="overflow-hidden rounded-2xl bg-primary-vue">
            <img
              id="imagen-principal"
              :src="imagenPrincipal"
              :alt="textoAlternativoImagenPrincipal"
              class="aspect-square w-full object-cover"
            />
          </div>
          <div v-if="imagenes.length > 1" class="mt-4 flex flex-wrap gap-3">
            <button
              v-for="(imagen, index) in imagenes"
              :key="imagen.id ?? index"
              type="button"
              class="product-gallery-thumbnail size-16 overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow,transform] focus-visible:border-text-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-page focus-visible:ring-2 focus-visible:ring-text-page focus-visible:ring-offset-2 dark:focus-visible:border-primary-vue dark:focus-visible:outline-primary-vue dark:focus-visible:ring-primary-vue dark:focus-visible:ring-offset-background"
              :class="
                index === indiceImagenActiva
                  ? 'border-text-page shadow-sm dark:border-primary-vue'
                  : 'border-transparent hover:border-text-page/50 dark:hover:border-primary-vue/70'
              "
              :aria-label="`Ver imagen: ${nombreImagen(imagen, index)}`"
              :aria-current="index === indiceImagenActiva ? 'true' : undefined"
              :aria-pressed="index === indiceImagenActiva"
              aria-controls="imagen-principal"
              @click="seleccionarImagen(index)"
            >
              <img :src="resolverImagen(imagen)" alt="" class="size-full object-cover" />
            </button>
          </div>
        </section>

        <section class="space-y-6">
          <div>
            <h1 class="text-text-page text-3xl font-bold dark:text-primary-vue">
              {{ producto?.nombre ?? info?.nombre }}
            </h1>
            <div class="mt-3">
              <p class="text-text-page2 text-sm font-semibold dark:text-primary-vue">Precio base</p>
              <p class="text-text-page mt-1 text-2xl font-semibold dark:text-primary-vue">
                {{ precioBaseFormateado }}
              </p>
            </div>
          </div>

          <p
            v-if="descripcion"
            class="text-text-page2 max-w-prose leading-relaxed dark:text-primary-vue"
          >
            {{ descripcion }}
          </p>

          <p
            v-if="requiereAnticipo"
            class="rounded-xl bg-primary-vue px-4 py-3 text-sm text-text-page"
          >
            Este producto requiere un anticipo para agendarse. Te indicaremos el monto al confirmar
            tu pedido.
          </p>

          <div v-if="permiteModificaciones" class="space-y-3">
            <h2 id="modo-pedido-titulo" class="text-text-page font-semibold dark:text-primary-vue">
              ¿Cómo lo quieres?
            </h2>
            <RadioGroup
              :model-value="modo"
              aria-labelledby="modo-pedido-titulo"
              class="gap-3"
              @update:model-value="onModo"
            >
              <label
                class="product-mode-option flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-[border-color,background-color] focus-within:ring-2 focus-within:ring-text-page/50 focus-within:ring-offset-2 dark:focus-within:ring-primary-vue/70"
                :class="
                  modo === 'tal_cual'
                    ? 'is-selected border-text-page bg-primary-vue'
                    : 'border-secondary-vue bg-background hover:border-text-page/50 dark:border-primary-vue/45 dark:bg-text-page dark:hover:border-primary-vue/70 dark:hover:bg-text-page/90'
                "
              >
                <RadioGroupItem
                  value="tal_cual"
                  aria-label="Tal cual"
                  aria-describedby="modo-tal-cual-descripcion"
                  class="mt-0.5 border-text-page text-text-page focus-visible:border-text-page focus-visible:ring-text-page/50 dark:border-primary-vue dark:text-primary-vue"
                />
                <span>
                  <span
                    class="product-mode-title block font-medium"
                    :class="
                      modo === 'tal_cual'
                        ? 'text-text-page'
                        : 'text-text-page dark:text-primary-vue'
                    "
                  >
                    Tal cual
                  </span>
                  <span
                    id="modo-tal-cual-descripcion"
                    class="product-mode-description block text-sm"
                    :class="
                      modo === 'tal_cual'
                        ? 'text-text-page2'
                        : 'text-text-page2 dark:text-primary-vue'
                    "
                  >
                    Lo quiero como se muestra.
                  </span>
                </span>
              </label>
              <label
                class="product-mode-option flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-[border-color,background-color] focus-within:ring-2 focus-within:ring-text-page/50 focus-within:ring-offset-2 dark:focus-within:ring-primary-vue/70"
                :class="
                  modo === 'modificacion'
                    ? 'is-selected border-text-page bg-primary-vue'
                    : 'border-secondary-vue bg-background hover:border-text-page/50 dark:border-primary-vue/45 dark:bg-text-page dark:hover:border-primary-vue/70 dark:hover:bg-text-page/90'
                "
              >
                <RadioGroupItem
                  value="modificacion"
                  aria-label="Con una modificación"
                  aria-describedby="modo-modificacion-descripcion"
                  class="mt-0.5 border-text-page text-text-page focus-visible:border-text-page focus-visible:ring-text-page/50 dark:border-primary-vue dark:text-primary-vue"
                />
                <span>
                  <span
                    class="product-mode-title block font-medium"
                    :class="
                      modo === 'modificacion'
                        ? 'text-text-page'
                        : 'text-text-page dark:text-primary-vue'
                    "
                  >
                    Con una modificación
                  </span>
                  <span
                    id="modo-modificacion-descripcion"
                    class="product-mode-description block text-sm"
                    :class="
                      modo === 'modificacion'
                        ? 'text-text-page2'
                        : 'text-text-page2 dark:text-primary-vue'
                    "
                  >
                    Quiero cambiar algo (colores, texto, tema...). Lo cotizamos contigo.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          <div v-if="esModificacion" class="space-y-4">
            <p class="rounded-xl bg-primary-vue px-4 py-3 text-sm text-text-page" role="status">
              El precio base es una referencia. Te enviaremos una cotización antes de confirmar tu
              pedido.
            </p>
            <div class="space-y-1.5">
              <Label for="modif-descripcion">Describe tu modificación *</Label>
              <Textarea
                id="modif-descripcion"
                v-model="descripcionModificacion"
                placeholder="Ej. quiero que sea temática de dinosaurios, en tonos verdes..."
                class="min-h-24"
              />
            </div>
            <div class="space-y-1.5">
              <ProductImagesManager
                v-model="fotos"
                titulo="Fotos de referencia (opcional)"
                subtitulo="Sube fotos de ejemplo para que entendamos la modificación que quieres."
              />
            </div>
          </div>

          <div class="pt-2">
            <Button
              size="lg"
              type="button"
              class="w-full rounded-full bg-text-page px-7 font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-text-page/90 hover:shadow-xl active:translate-y-0 active:shadow-md focus-visible:ring-text-page disabled:translate-y-0 disabled:shadow-sm sm:w-auto dark:focus-visible:ring-primary-vue"
              :disabled="enviando"
              aria-describedby="agregar-pedido-ayuda"
              @click="solicitar"
            >
              Agregar a mi pedido
            </Button>
            <p
              id="agregar-pedido-ayuda"
              class="text-text-page2 mt-3 max-w-md text-sm leading-relaxed dark:text-primary-vue"
            >
              Agregarlo a tu pedido no envía la solicitud; podrás revisarla antes de enviarla.
            </p>
          </div>
        </section>
      </div>
    </article>
  </ProductLayout>
</template>

<style scoped>
:global(.dark) .product-mode-option {
  background-color: var(--color-text-page) !important;
  border-color: var(--color-primary-vue);
  border-color: color-mix(in srgb, var(--color-primary-vue) 45%, transparent);
}

:global(.dark) .product-mode-option.is-selected {
  border-color: var(--color-primary-vue);
}

:global(.dark) .product-mode-title,
:global(.dark) .product-mode-description {
  color: var(--color-primary-vue) !important;
}

:global(.dark) .product-gallery-thumbnail:focus-visible {
  outline-color: var(--color-primary-vue);
}
</style>
