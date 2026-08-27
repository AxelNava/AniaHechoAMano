# Producto

<!-- impeccable:product-schema 1 -->

## Plataforma

web

## Usuarios

- **Clientes locales:** personas que buscan encargos artesanales para regalos y celebraciones, y necesitan explorar opciones, pedir una personalización, cotizarla y coordinar su entrega local.
- **Administración de Ania:** la artesana o equipo autorizado que mantiene el catálogo y los componentes, gestiona la agenda y acompaña cada pedido desde la solicitud hasta la entrega.

## Propósito del producto

Ania Hecho a Mano permite descubrir, solicitar y seguir pedidos artesanales personalizados para celebraciones y regalos. El sitio debe facilitar que los clientes locales inicien un encargo con la información necesaria y que Ania gestione cotizaciones, disponibilidad, anticipos y entregas.

El éxito consiste en convertir una idea o necesidad de celebración en un pedido claro, viable y correctamente coordinado.

## Posicionamiento

El valor diferencial es el trabajo hecho a mano con personalización real: los encargos a medida se resuelven mediante una cotización antes de confirmar precio o fecha, en lugar de prometer disponibilidad automática.

## Contexto operativo

El recorrido público abarca catálogo por categorías, detalle de producto, pedido definido o solicitud de modificación, datos de contacto y entrega local, fecha solicitada, confirmación y seguimiento. La administración gestiona productos, categorías, componentes, solicitudes, historial de pedidos y agenda de disponibilidad. La zona de entrega y los requisitos mínimos de dirección todavía deben definirse; el recorrido no debe presentarlos como cobertura geográfica confirmada.

Las categorías actualmente configuradas incluyen adornos de fiesta, papelería creativa, postres y sublimación. Los términos de negocio relevantes son pedido, solicitud, modificación, cotización, anticipo, fecha solicitada, fecha acordada, agenda, disponibilidad, bloqueo y seguimiento.

## Capacidades y restricciones

- Un pedido definido puede incluir contacto, dirección, fecha solicitada y resumen; la confirmación final de fecha depende de Ania. Los requisitos obligatorios de dirección y la zona atendida aún no están definidos.
- Un pedido modificado puede incluir una descripción y fotos de referencia, y se resuelve por cotización antes de fijar precio o fecha.
- Los pedidos locales son el alcance operativo previsto; los envíos fuera de la zona no están confirmados.
- El panel administrativo debe quedar restringido al personal autorizado, pero el modelo de autenticación, autorización y roles sigue pendiente de definición. La interfaz administrativa actual no prueba que esa restricción esté implementada.
- Teléfonos, direcciones, fotos de referencia y demás datos del pedido se usan únicamente para gestionarlo. No deben persistirse como datos personales en el navegador; cualquier retención fuera de la sesión debe definirse, justificarse y protegerse explícitamente.
- La implementación actual que persiste datos personales en `localStorage` debe considerarse una brecha respecto de esta restricción hasta que se elimine o exista una política de consentimiento aprobada.

## Compromisos de marca

El nombre del negocio es **Ania Hecho a Mano**. Deben preservarse los compromisos de artesanía, personalización y cotización a medida. La comunicación existente es cálida y cercana; no se deben inventar datos de contacto, cobertura geográfica, precios ni promesas de plazo.

## Evidencia disponible

- Logotipos: `src/assets/svg/ania.svg`, `src/assets/svg/ania-titulo-completo.svg` y `src/assets/svg/Hecho-a-mano.svg`.
- Imágenes: `src/assets/images/logo.jpg`, `src/assets/images/PXL_20250201_210547830~2.jpg` y `src/assets/images/default-product.jpg`.
- Tipografías locales: `public/fonts/`.
- Contenido y flujos reales se encuentran en las vistas y servicios de `src/`.
- No hay testimonios, métricas, precios, cobertura de entrega ni políticas legales confirmadas para presentar como evidencia pública.
- La definición de zona de entrega y de los campos de dirección requeridos sigue pendiente de una decisión comercial.

## Principios de producto

1. **El pedido debe ser comprensible antes de ser confirmado:** mostrar con claridad qué datos se solicitan y qué queda sujeto a cotización o disponibilidad.
2. **La personalización requiere conversación responsable:** no simular precio ni fecha definitiva antes de la evaluación de Ania.
3. **La operación local debe guiar el flujo:** la entrega se coordina como parte del pedido, no como una promesa logística genérica.
4. **Los datos personales no permanecen en el navegador:** el acceso administrativo debe limitarse al personal autorizado y la información de pedidos se usa solo para gestionarlos, sin persistencia local de datos personales.
5. **La entrega se comunica con precisión:** hasta definir la zona atendida y los requisitos de dirección, el producto no promete cobertura ni condiciones logísticas que no estén confirmadas.
6. **La artesanía debe mantenerse honesta:** no reemplazar el carácter hecho a mano por automatismos ni afirmaciones comerciales no verificadas.

## Accesibilidad e inclusión

La interfaz debe conservar navegación responsive, etiquetas y estados de carga/error comprensibles, foco visible y contraste suficiente. No hay un estándar formal confirmado; cualquier requisito legal o nivel WCAG específico queda pendiente de definición.
