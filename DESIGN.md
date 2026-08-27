---
name: Ania Hecho a Mano
description: Sistema visual cálido y táctil para encargos artesanales personalizados.
colors:
  tinta-ciruela: "#701548"
  tinta-suave: "#745674"
  lila-papel: "#ead9ea"
  lila-suave: "#ead8ea"
  papel: "oklch(1 0 0)"
  niebla: "oklch(0.97 0 0)"
  texto-atenuado: "oklch(0.556 0 0)"
  borde-suave: "oklch(0.922 0 0)"
  anillo-suave: "oklch(0.87 0 0)"
  alerta: "oklch(0.577 0.245 27.325)"
  papel-oscuro: "oklch(0.145 0 0)"
  borde-oscuro: "oklch(0.269 0 0)"
typography:
  display:
    fontFamily: "Dancing Script, cursive"
    fontSize: "2.5rem"
    fontWeight: 400
  body:
    fontFamily: "Inter Var, ui-sans-serif, sans-serif"
    fontSize: "1rem"
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  card: "16px"
  pill: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-public:
    backgroundColor: "{colors.tinta-ciruela}"
    textColor: "{colors.papel}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-ui:
    backgroundColor: "{colors.lila-papel}"
    textColor: "{colors.tinta-ciruela}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  card-product:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta-ciruela}"
    rounded: "{rounded.card}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-ciruela}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  order-stepper:
    backgroundColor: "{colors.lila-papel}"
    textColor: "{colors.tinta-ciruela}"
    rounded: "{rounded.pill}"
    size: "32px"
---

# Design System: Ania Hecho a Mano

## Overview

**Creative North Star: "El Taller de Recuerdos"**

El sistema visual ya implementado convierte la exploración de productos y el encargo personalizado en una experiencia cercana, manual y confiable. La tienda pública usa la calidez de una firma escrita, superficies claras y un diálogo entre lila suave y tinta ciruela para que cada encargo se sienta atendido, no automatizado.

La interfaz alterna dos registros que deben mantenerse distinguibles: el público es expresivo, redondeado y celebratorio; la administración es compacta y semántica para sostener la operación. Ambos comparten la misma base de color, foco visible y jerarquía, pero la marca aparece con mayor presencia en los momentos de descubrimiento, selección y confirmación.

**Key Characteristics:**
- Tipografía manuscrita reservada para la identidad y titulares de alto valor emocional.
- Lila de papel como apoyo suave; tinta ciruela como voz, acción y contraste.
- Tarjetas táctiles con respuesta visible para productos y decisiones del pedido.
- Controles operativos compactos, claros y accesibles.

## Colors

La paleta funciona como materiales de papelería: un fondo de papel limpio, lila suave para acompañar y una tinta ciruela que firma las decisiones importantes.

### Primary
- **Lila papel:** superficie de selección, etiquetas y controles que acompañan sin competir con el contenido.
- **Tinta ciruela:** texto de marca, bordes de CTA públicos, enlaces y estados que necesitan intención.

**The Ink Leads Rule.** La tinta ciruela dirige acciones y lectura; el lila papel la acompaña como superficie, nunca intenta reemplazar su contraste.

### Secondary
- **Lila suave:** variación de apoyo para capas y estados secundarios de la tienda pública.
- **Tinta suave:** texto descriptivo de productos cuando la jerarquía no requiere la tinta principal.

### Neutral
- **Papel:** superficie base de páginas, tarjetas y popovers en modo claro.
- **Niebla:** superficie semántica atenuada para estados auxiliares.
- **Borde suave:** delimitación discreta de campos y contenedores operativos.
- **Texto atenuado:** información secundaria y placeholders.

### Tertiary
- **Alerta:** estados destructivos y excepciones de disponibilidad; no se usa como decoración.

## Typography

**Display Font:** Dancing Script (con fallback cursiva)
**Body Font:** Inter Var (con fallback sans-serif)
**Label/Mono Font:** Instrument Sans (con fallback de sistema)

**Character:** La escritura de display representa el gesto humano de Ania; Inter Var mantiene legible la información de catálogo y pedido. Los controles usan una sans compacta para que la operación no pierda precisión.

### Hierarchy
- **Display** (400, 2.5rem): identidad, encabezados memorables y momentos de bienvenida.
- **Title** (600, 1.25rem a 1.3rem): títulos de producto y decisiones dentro del catálogo.
- **Body** (400, 1rem): descripciones y contenido de pedido.
- **Label** (500, 0.875rem): botones, campos, navegación y estados operativos.

**The Signature Reserve Rule.** Dancing Script se reserva para identidad y titulares expresivos; los precios, formularios, estados y textos de operación permanecen en sans-serif.

## Layout

La tienda usa contenedores centrados con relleno lateral y una progresión de anchos según la tarea: catálogo y navegación en contenedores amplios, pedidos en superficies más enfocadas y confirmación/seguimiento en anchos estrechos. La grilla de catálogo pasa de una columna a dos en `md` y tres en `lg`; el contenido operativo prioriza una sola columna legible antes que la densidad.

El ritmo recurrente usa pasos de 8px, 16px, 24px y 32px. Las tarjetas de producto separan imagen y contenido; los paneles de pedido concentran la información con relleno generoso. El breakpoint local `xs` existe a 480px y la marca ajusta su logo a 480px y 768px.

**The One Clear Task Rule.** En pedidos y administración, cada pantalla debe hacer evidente la siguiente decisión antes de añadir ornamentación o información secundaria.

## Elevation & Depth

La profundidad es táctil: los controles públicos responden al hover elevándose levemente y las tarjetas de producto usan una sombra amplia como señal de exploración. Los componentes semánticos de operación usan sombras pequeñas o bordes suaves; no mezclan una sombra dramática con un borde decorativo en reposo.

### Shadow Vocabulary
- **Product halo:** halo amplio para tarjetas de catálogo; se reserva para superficies explorables de producto.
- **Operational lift:** sombra pequeña en botones, inputs y tarjetas semánticas para mantener separación sin teatralidad.
- **Dialog focus:** overlay oscuro y superficie elevada para aislar tareas que sí requieren foco protegido.

**The Touch Response Rule.** La elevación comunica una acción disponible o un cambio de contexto; no se agrega como textura de fondo.

## Shapes

El lenguaje combina bordes redondeados y suaves con una jerarquía clara: campos y controles compactos usan radios medianos; tarjetas y etiquetas de producto usan curvas más amplias; los pills se reservan para CTAs públicos, filtros o estados breves. Las imágenes de producto se recortan en el mismo contorno de la tarjeta para mantener una pieza única.

**The Pill Has a Job Rule.** Un pill identifica una acción corta, una etiqueta o un estado; los paneles de contenido conservan radios de tarjeta para no diluir la jerarquía.

## Components

### Buttons

Cercanos y táctiles: los CTA públicos usan tinta ciruela, borde firme y elevación breve al hover; los botones semánticos usan lila papel con altura compacta.

- **Shape:** CTA público en pill; control de UI en radio mediano.
- **Primary:** tinta ciruela sobre papel para acciones de descubrimiento; lila papel con tinta para acciones semánticas.
- **Hover / Focus:** el CTA público se eleva; todos los controles conservan foco visible mediante anillo semántico.
- **Secondary / Ghost:** el CTA público puede partir de papel con borde de tinta y rellenarse al hover; las variantes de UI respetan los tokens semánticos.

### Chips

- **Style:** lila papel, tinta ciruela, forma de tarjeta pequeña y relleno horizontal generoso.
- **State:** las etiquetas describen categorías o atributos; no sustituyen una acción primaria.

### Cards / Containers

- **Corner Style:** tarjeta de producto amplia y tarjeta semántica moderada.
- **Background:** papel en modo claro; el lila se usa para selección, no como fondo continuo de toda la pantalla.
- **Shadow Strategy:** halo exclusivo para producto; sombra pequeña o borde suave en operación.
- **Internal Padding:** el contenido de producto usa espacio lateral amplio; los paneles de pedido usan el paso grande de la escala.

### Inputs / Fields

- **Style:** fondo transparente, borde suave, radio mediano y altura compacta.
- **Focus:** anillo semántico visible; no depende solo del cambio de color para comunicar foco.
- **Error / Disabled:** los estados inválidos usan el token de alerta; los deshabilitados reducen contraste sin ocultar su condición.

### Navigation

La navegación pública permanece sticky, alta y espaciosa; la administrativa es más compacta. Ambas usan superficie de papel, borde inferior y enlaces de tinta ciruela; el estado activo móvil puede usar una superficie lila.

### Product Card

La tarjeta de producto es la pieza distintiva: imagen en proporción horizontal, título en tinta, descripción en tinta suave y etiquetas lilas. Al hover revela una invitación a ver el detalle y refuerza el borde/sombra sin desplazar el contenido esencial.

### Order Stepper

El stepper usa círculos compactos, conectores finos y tres estados: completado en lila con tinta, activo con borde principal y pendiente atenuado. Es una guía de progreso, no un elemento decorativo.

## Do's and Don'ts

### Do:
- **Do** usar tinta ciruela para acciones, enlaces y lectura de máxima prioridad dentro de la experiencia pública.
- **Do** reservar Dancing Script para identidad y titulares donde el gesto artesanal agrega significado.
- **Do** usar lila papel para selección, etiquetas y controles de apoyo, manteniendo texto de alto contraste.
- **Do** conservar un foco visible y estados de error explícitos en cada control interactivo.
- **Do** aplicar la sombra amplia solo a tarjetas de producto que invitan a explorar.

### Don't:
- **Don't** convertir el lila papel en texto principal ni en una superficie que reduzca la legibilidad de un formulario.
- **Don't** usar la tipografía manuscrita para datos de pedido, estados, precios o controles administrativos.
- **Don't** trasladar los azules, grises o verdes utilitarios aislados de formularios CRUD a nuevos componentes compartidos sin una decisión de sistema.
- **Don't** añadir halos, blur o elevación a cada contenedor: la respuesta táctil debe seguir señalando una interacción real.
- **Don't** prometer disponibilidad, precio o entrega automática cuando el flujo exige cotización o confirmación humana.
