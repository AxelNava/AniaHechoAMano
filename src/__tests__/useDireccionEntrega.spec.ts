import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useDireccionEntrega } from "@/composables/pedido/useDireccionEntrega";

describe("useDireccionEntrega — soft-gate de Maps", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("la 1ª omisión sin maps_url no permite continuar y devuelve un aviso", () => {
    const { validarContinuar, mapsUrlOmitida } = useDireccionEntrega();

    const resultado = validarContinuar();

    expect(resultado.ok).toBe(false);
    expect(resultado.aviso).toBeTruthy();
    expect(mapsUrlOmitida.value).toBe(false);
  });

  it("la 2ª omisión permite continuar y marca maps_url_omitida", () => {
    const { validarContinuar, mapsUrlOmitida } = useDireccionEntrega();

    validarContinuar(); // 1ª: avisa
    const segundo = validarContinuar(); // 2ª: permite

    expect(segundo.ok).toBe(true);
    expect(mapsUrlOmitida.value).toBe(true);
  });

  it("con maps_url continúa de una y limpia el estado de omisión", () => {
    const { entrega, validarContinuar, mapsUrlOmitida, intentosOmitirMaps } = useDireccionEntrega();

    validarContinuar(); // marca un intento previo
    entrega.value.maps_url = "https://maps.app.goo.gl/abc";
    const resultado = validarContinuar();

    expect(resultado.ok).toBe(true);
    expect(mapsUrlOmitida.value).toBe(false);
    expect(intentosOmitirMaps.value).toBe(0);
  });
});
