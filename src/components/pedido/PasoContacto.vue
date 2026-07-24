<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import type { TipoRedSocial } from "@/types/orders/createPedidoPublicoDto";

// Paso "Contacto" del wizard: edita directamente el contacto del carrito
// compartido (store) vía el composable. Responsabilidad única: capturar cómo
// contactar al cliente. La validación la centraliza `usePedidoWizard`.
const { contacto } = usePedidoCliente();

const REDES: { valor: TipoRedSocial; etiqueta: string }[] = [
  { valor: "FACEBOOK", etiqueta: "Facebook" },
  { valor: "INSTAGRAM", etiqueta: "Instagram" },
  { valor: "WHATSAPP", etiqueta: "WhatsApp" },
  { valor: "OTRO", etiqueta: "Otro" },
];

const onTipoRedSocial = (valor: unknown) => {
  contacto.value.tipo_red_social = typeof valor === "string" ? (valor as TipoRedSocial) : "";
};
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-text-page text-lg font-semibold">¿Cómo te contactamos?</h2>
      <p class="text-text-page2 text-sm">
        Con estos datos coordinamos la entrega y, si pediste una modificación, te
        escribimos para cotizarla.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-1.5">
        <Label for="contacto-nombre">Nombre *</Label>
        <Input id="contacto-nombre" v-model="contacto.nombre" placeholder="Tu nombre" />
      </div>

      <div class="space-y-1.5">
        <Label for="contacto-telefono">Teléfono</Label>
        <Input
          id="contacto-telefono"
          v-model="contacto.telefono"
          type="tel"
          placeholder="Ej. 5512345678"
        />
      </div>

      <div class="space-y-1.5">
        <Label>Red social</Label>
        <Select :model-value="contacto.tipo_red_social" @update:model-value="onTipoRedSocial">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Selecciona (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="red in REDES" :key="red.valor" :value="red.valor">
              {{ red.etiqueta }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1.5">
        <Label for="contacto-perfil">Usuario o enlace de perfil</Label>
        <Input
          id="contacto-perfil"
          v-model="contacto.url_perfil"
          placeholder="Ej. facebook.com/tu.perfil o @tuusuario"
        />
      </div>
    </div>

    <p class="text-text-page2 text-xs">
      Déjanos al menos un medio de contacto (teléfono o perfil de red social).
    </p>
  </div>
</template>
