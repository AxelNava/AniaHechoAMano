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
import { ProductApi, resolveProductBinaryUrl, resolveProductImageUrl } from "@/services/products/productApi";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import defaultProductImage from "@/assets/images/default-product.jpg";
import { formatCurrency } from "@/utils/orderDisplay";
import type { ProductDto, ProductImageDto, ProductImageItem } from "@/types/products/ProductDto";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";

type ModoPedido = "tal_cual" | "modificacion";

const route = useRoute();
const router = useRouter();
const productApi = new ProductApi();
const cliente = usePedidoCliente();

const slug = computed(() => String(route.params.slug ?? ""));
const productId = computed(() => Number(route.params.id));

const producto = ref<ProductDto | null>(null);
const info = ref<ProductoInfoPedidoDto | null>(null);
const cargando = ref(true);
const errorCarga = ref("");

const modo = ref<ModoPedido>("tal_cual");
const descripcionModificacion = ref("");
const fotos = ref<ProductImageItem[]>([]);
const imagenActiva = ref(0);
const enviando = ref(false);

const permiteModificaciones = computed(
  () => producto.value?.permite_modificaciones ?? info.value?.permite_modificaciones ?? false,
);
const requiereAnticipo = computed(
  () => producto.value?.requiere_anticipo ?? info.value?.requiere_anticipo ?? false,
);
const precioBase = computed(() => info.value?.precio_base ?? producto.value?.precio_base ?? 0);
const descripcion = computed(
  () => info.value?.descripcion?.trim() || producto.value?.descripcion?.trim() || "",
);

const imagenes = computed<ProductImageDto[]>(() =>
  [...(producto.value?.imagenes ?? [])].sort((a, b) => a.orden - b.orden),
);

const resolverImagen = (imagen: ProductImageDto): string => {
  if (imagen.binario_url) return resolveProductBinaryUrl(imagen.binario_url);
  if (imagen.url) return resolveProductImageUrl(imagen.url);
  return defaultProductImage;
};

const imagenPrincipal = computed(() => {
  const lista = imagenes.value;
  if (!lista.length) return defaultProductImage;
  return resolverImagen(lista[Math.min(imagenActiva.value, lista.length - 1)]);
});

const esModificacion = computed(() => permiteModificaciones.value && modo.value === "modificacion");

const cargarProducto = async () => {
  cargando.value = true;
  errorCarga.value = "";
  imagenActiva.value = 0;
  try {
    const [detalle, ordenInfo] = await Promise.all([
      productApi.getProductById(productId.value),
      productApi.getProductOrderInfo(productId.value),
    ]);

    if (!detalle && !ordenInfo) {
      errorCarga.value = "No encontramos este producto. Puede que ya no esté disponible.";
      return;
    }

    producto.value = detalle;
    info.value = ordenInfo;
    // Si el producto no admite modificaciones, forzamos el modo "tal cual".
    if (!permiteModificaciones.value) modo.value = "tal_cual";
  } catch {
    errorCarga.value = "Ocurrió un error al cargar el producto. Intenta de nuevo.";
  } finally {
    cargando.value = false;
  }
};

const onModo = (valor: unknown) => {
  modo.value = valor === "modificacion" ? "modificacion" : "tal_cual";
};

// Carga al montar y al navegar entre fichas de producto (misma ruta, otro id).
watch(productId, cargarProducto, { immediate: true });

const solicitar = () => {
  if (!info.value) {
    toast.error("Todavía estamos cargando el producto, intenta en un momento.");
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
  cliente.agregarLinea(info.value, {
    esModificacion: esModificacion.value,
    descripcion: esModificacion.value ? descripcionModificacion.value : "",
    fotos: archivos,
  });

  toast.success(`"${info.value.nombre}" agregado a tu pedido`);
  router.push("/pedido");
};
</script>

<template>
  <ProductLayout>
    <div v-if="cargando" class="py-24 text-center text-text-page2">Cargando producto...</div>

    <div v-else-if="errorCarga" class="py-24 text-center">
      <p class="text-text-page mb-2 text-xl font-medium">{{ errorCarga }}</p>
      <RouterLink :to="`/categoria/${slug}`" class="text-primary underline">
        Volver al catálogo
      </RouterLink>
    </div>

    <article v-else class="py-6">
      <nav class="text-text-page2 mb-6 text-sm">
        <RouterLink :to="`/categoria/${slug}`" class="hover:text-text-page">← Volver al catálogo</RouterLink>
      </nav>

      <div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <!-- Galería -->
        <section>
          <div class="overflow-hidden rounded-2xl bg-purple-100 dark:bg-gray-800">
            <img
              :src="imagenPrincipal"
              :alt="producto?.nombre ?? 'Producto'"
              class="aspect-square w-full object-cover"
            />
          </div>
          <div v-if="imagenes.length > 1" class="mt-4 flex flex-wrap gap-3">
            <button
              v-for="(imagen, index) in imagenes"
              :key="imagen.id ?? index"
              type="button"
              class="size-16 overflow-hidden rounded-lg border-2 transition-colors"
              :class="index === imagenActiva ? 'border-primary' : 'border-transparent'"
              @click="imagenActiva = index"
            >
              <img :src="resolverImagen(imagen)" alt="" class="size-full object-cover" />
            </button>
          </div>
        </section>

        <!-- Info + modo -->
        <section class="space-y-6">
          <div>
            <h1 class="text-text-page text-3xl font-bold">{{ producto?.nombre ?? info?.nombre }}</h1>
            <p class="text-primary mt-2 text-2xl font-semibold">{{ formatCurrency(precioBase) }}</p>
          </div>

          <p v-if="descripcion" class="text-text-page2 leading-relaxed">{{ descripcion }}</p>

          <p
            v-if="requiereAnticipo"
            class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
          >
            Este producto requiere un anticipo para agendarse. Te indicaremos el
            monto al confirmar tu pedido.
          </p>

          <!-- Modo: tal cual vs modificación -->
          <div v-if="permiteModificaciones" class="space-y-3">
            <h2 class="text-text-page font-semibold">¿Cómo lo quieres?</h2>
            <RadioGroup :model-value="modo" @update:model-value="onModo" class="gap-3">
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                :class="modo === 'tal_cual' ? 'border-primary bg-primary/5' : ''"
              >
                <RadioGroupItem value="tal_cual" class="mt-0.5" />
                <span>
                  <span class="text-text-page block font-medium">Tal cual</span>
                  <span class="text-text-page2 block text-sm">Lo quiero como se muestra.</span>
                </span>
              </label>
              <label
                class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                :class="modo === 'modificacion' ? 'border-primary bg-primary/5' : ''"
              >
                <RadioGroupItem value="modificacion" class="mt-0.5" />
                <span>
                  <span class="text-text-page block font-medium">Con una modificación</span>
                  <span class="text-text-page2 block text-sm">
                    Quiero cambiar algo (colores, texto, tema...). Lo cotizamos contigo.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          <!-- Detalle de la modificación -->
          <div v-if="esModificacion" class="space-y-4">
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
            <Button size="lg" class="w-full sm:w-auto" :disabled="enviando" @click="solicitar">
              Solicitar
            </Button>
          </div>
        </section>
      </div>
    </article>
  </ProductLayout>
</template>
