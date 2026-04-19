<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ProductApi } from "@/services/products/productApi";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { ComponentsApi } from "@/services/products/componentsApi";
import { useCategoriesStore } from "@/stores/categoriesStore";
import { useComponentsStore } from "@/stores/componentsStore";
import { storeToRefs } from "pinia";
import { toast } from "vue-sonner";

const router = useRouter();
const categoriesStore = useCategoriesStore();
const componentsStore = useComponentsStore();
const { categories } = storeToRefs(categoriesStore);
const { components: availableComponents } = storeToRefs(componentsStore);

const product = ref({
  name: "",
  description: "",
  price: 0,
  categoryId: null as number | null,
  images: [] as File[],
});
const productApi = new ProductApi();
const categoriesApi = new CategoriesApi();
const componentsApi = new ComponentsApi();

const productComponents = ref<{ componente_id: number | null; cantidad: number }[]>([]);
const newCategoryName = ref("");
const loading = ref(false);
const error = ref("");

const showCategoryModal = ref(false);
const showComponentModal = ref(false);

const newComponentData = ref({
  nombre: "",
  tipo: "",
  descripcion: "",
  unidadMedida: "",
  requierePedidoPrevio: false,
});

const fetchData = async () => {
  try {
    await Promise.all([
      categoriesStore.fetchCategories(),
      componentsStore.fetchComponents(),
    ]);
  } catch (e) {
    console.error(e);
  }
};

const addComponent = () => {
  productComponents.value.push({ componente_id: null, cantidad: 1 });
};

const removeComponent = (index: number) => {
  productComponents.value.splice(index, 1);
};

const createNewCategory = async () => {
  if (!newCategoryName.value) return null;
  try {
    const success = await categoriesApi.createCategories([{ nombre: newCategoryName.value }]);
    if (success) {
      await categoriesStore.fetchCategories(true);
      const newCategory = categories.value.find((c) => c.nombre === newCategoryName.value);
      if (newCategory) {
        product.value.categoryId = newCategory.id;
      }
      newCategoryName.value = "";
      showCategoryModal.value = false;
      toast.success("Categoría creada exitosamente", {
        style: { background: "#111827", color: "#ffffff", border: "1px solid #374151" },
      });
      return newCategory?.id || null;
    }
  } catch (e) {
    toast.error("Error al crear categoría");
    console.error(e);
  }
  return null;
};

const createNewComponent = async () => {
  if (
    !newComponentData.value.nombre ||
    !newComponentData.value.tipo ||
    !newComponentData.value.unidadMedida
  ) {
    toast.error("Por favor completa los campos obligatorios");
    return;
  }
  try {
    const newComp = await componentsApi.createComponentes({
      nombre: newComponentData.value.nombre,
      tipo: newComponentData.value.tipo,
      descripcion: newComponentData.value.descripcion,
      unidad_medida: newComponentData.value.unidadMedida,
      requiere_pedido_previo: newComponentData.value.requierePedidoPrevio,
      activo: true,
    });
    
    if (newComp) {
      componentsStore.addComponent(newComp);

      newComponentData.value = {
        nombre: "",
        tipo: "",
        descripcion: "",
        unidadMedida: "",
        requierePedidoPrevio: false,
      };
      showComponentModal.value = false;
      toast.success("Componente creado exitosamente", {
        style: { background: "#111827", color: "#ffffff", border: "1px solid #374151" },
      });
    } else {
      toast.error("Error al crear componente");
    }
  } catch (e) {
    toast.error("Error al crear componente");
    console.error(e);
  }
};

const submitProduct = async () => {
  loading.value = true;
  error.value = "";

  try {
    const catId = product.value.categoryId;

    if (!catId) {
      error.value = "Please select or create a category";
      loading.value = false;
      return;
    }

    const validComponents = productComponents.value
      .filter((c) => c.componente_id !== null && c.cantidad > 0)
      .map((c) => ({ componente_id: c.componente_id as number, cantidad: c.cantidad }));

    const result = await productApi.createProduct({
      nombre: product.value.name,
      descripcion: product.value.description,
      precio_base: Number(product.value.price),
      categoria_id: catId,
      activo: true,
      componentes: validComponents,
    });
    if (result) {
      toast.success("Producto creado exitosamente", {
        style: { background: "#111827", color: "#ffffff", border: "1px solid #374151" },
      });
      product.value = {
        name: "",
        description: "",
        price: 0,
        categoryId: null as number | null,
        images: [] as File[],
      };
      productComponents.value = [];
      newCategoryName.value = "";
    } else {
      error.value = "Failed to create product";
    }
  } catch (_) {
    toast.error("Error al crear producto");
    error.value = "Failed to create product";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-10">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Crear nuevo producto</h1>

    <form @submit.prevent="submitProduct" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          v-model="product.name"
          required
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Nombre del producto"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          v-model="product.description"
          rows="3"
          class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Descripción del producto"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Precio</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            v-model="product.price"
            required
            class="w-full border border-gray-300 rounded-md p-2 pl-7 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
        <select
          v-model="product.categoryId"
          class="w-full border border-gray-300 rounded-md p-2 mb-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option :value="null" disabled>Selecciona una categoría</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nombre }}</option>
        </select>

        <div class="mt-3">
          <button
            type="button"
            @click="showCategoryModal = true"
            class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer underline"
          >
            + Crear nueva categoría
          </button>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <label class="block text-sm font-medium text-gray-700">Componentes del producto</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="showComponentModal = true"
              class="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 font-medium transition-colors cursor-pointer border border-gray-200"
            >
              Crear componente
            </button>
            <button
              type="button"
              @click="addComponent"
              class="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium transition-colors cursor-pointer"
            >
              + Añadir componente
            </button>
          </div>
        </div>

        <div v-if="productComponents.length === 0" class="text-sm text-gray-500 italic mb-2">
          No hay componentes añadidos al producto.
        </div>

        <div
          v-for="(comp, index) in productComponents"
          :key="index"
          class="flex gap-2 mb-3 items-start"
        >
          <select
            v-model="comp.componente_id"
            class="flex-1 border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          >
            <option :value="null" disabled>Selecciona un componente</option>
            <option v-for="ac in availableComponents" :key="ac.id" :value="ac.id">
              {{ ac.nombre }} ({{ ac.unidad_medida }})
            </option>
          </select>
          <input
            type="number"
            v-model="comp.cantidad"
            min="0.01"
            step="0.01"
            class="w-24 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
            placeholder="Cant."
          />
          <button
            type="button"
            @click="removeComponent(index)"
            class="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            title="Eliminar componente"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="error"
        class="p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200"
      >
        {{ error }}
      </div>

      <div class="flex justify-end pt-4">
        <button
          type="button"
          @click="router.back()"
          class="mr-3 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {{ loading ? "Guardando..." : "Crear producto" }}
        </button>
      </div>
    </form>
  </div>

  <!-- Modal de Categoría -->
  <div
    v-if="showCategoryModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h2 class="text-lg font-bold mb-4 text-gray-800">Crear nueva categoría</h2>
      <form @submit.prevent="createNewCategory">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            v-model="newCategoryName"
            required
            class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Nombre de la categoría"
            autofocus
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="showCategoryModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Crear categoría
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal de Componente -->
  <div
    v-if="showComponentModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold mb-4 text-gray-800">Crear nuevo componente</h2>
      <form @submit.prevent="createNewComponent" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            v-model="newComponentData.nombre"
            required
            class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ej: Papel Crepé"
            autofocus
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select
            v-model="newComponentData.tipo"
            required
            class="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="" disabled>Selecciona el tipo</option>
            <option value="MATERIAL">Material / Materia Prima</option>
            <option value="ELEMENTO_ELABORADO">Elemento Pre-elaborado</option>
            <option value="SERVICIO">Servicio (Corte, Sublimado, etc.)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Tipo de Medición (Unidad) *</label
          >
          <input
            v-model="newComponentData.unidadMedida"
            required
            class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ej: pliego, metro, pieza, tubo"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            v-model="newComponentData.descripcion"
            rows="2"
            class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Descripción opcional"
          ></textarea>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="requierePedidoPrevio"
            v-model="newComponentData.requierePedidoPrevio"
            class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <label
            for="requierePedidoPrevio"
            class="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Requiere pedido previo a proveedor
          </label>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showComponentModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Crear componente
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<!--
<form @submit.prevent="submitform" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">
            nombre del producto
          </label>
          <input
            id="name"
            v-model="product.name"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="ej: amigurumi osito"
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700"
            >descripción</label
          >
          <textarea
            id="description"
            v-model="product.description"
            rows="3"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="descripción detallada del producto"
          ></textarea>
        </div>

        <div>
          <label for="price" class="block text-sm font-medium text-gray-700">precio</label>
          <input
            id="price"
            v-model="product.price"
            type="number"
            min="0"
            step="0.01"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label for="category" class="block text-sm font-medium text-gray-700">categoría</label>
          <select
            id="category"
            v-model="product.categoryid"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          >
            <option value="" disabled>seleccione una categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.nombre }}
            </option>
          </select>
        </div>

        <div>
          <label for="images" class="block text-sm font-medium text-gray-700">
            imágenes (opcional)
          </label>
          <input
            id="images"
            type="file"
            multiple
            accept="image/*"
            @change="handlefileupload"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
      </form>
-->
