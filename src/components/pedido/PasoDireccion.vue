<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";

// Paso "Dirección": captura la entrega del carrito compartido. El soft-gate del
// enlace de Maps lo aplica `usePedidoWizard` al presionar Continuar (composable
// `useDireccionEntrega`); aquí solo mostramos el aviso contextual.
const { entrega } = usePedidoCliente();
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-text-page text-lg font-semibold">¿Dónde entregamos?</h2>
      <p class="text-text-page2 text-sm">
        Comparte la dirección de entrega. El enlace de Google Maps es opcional,
        pero nos ayuda muchísimo a ubicarte.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-1.5">
        <Label for="entrega-calle">Calle</Label>
        <Input id="entrega-calle" v-model="entrega.calle" placeholder="Nombre de la calle" />
      </div>

      <div class="space-y-1.5">
        <Label for="entrega-numero">Número / casa</Label>
        <Input id="entrega-numero" v-model="entrega.numero_casa" placeholder="Ej. 123, int. B" />
      </div>

      <div class="space-y-1.5">
        <Label for="entrega-municipio">Municipio / colonia</Label>
        <Input id="entrega-municipio" v-model="entrega.municipio" placeholder="Municipio o colonia" />
      </div>

      <div class="space-y-1.5">
        <Label for="entrega-maps">Enlace de Google Maps</Label>
        <Input
          id="entrega-maps"
          v-model="entrega.maps_url"
          placeholder="Pega aquí el enlace de tu ubicación"
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <Label for="entrega-referencia">Referencias para llegar</Label>
      <Textarea
        id="entrega-referencia"
        v-model="entrega.referencia"
        placeholder="Ej. portón negro, frente a la tienda..."
      />
    </div>

    <div class="space-y-1.5">
      <Label for="entrega-notas">Notas de la entrega</Label>
      <Textarea
        id="entrega-notas"
        v-model="entrega.notas"
        placeholder="Horario preferido, indicaciones especiales..."
      />
    </div>
  </div>
</template>
