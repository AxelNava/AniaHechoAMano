# Fotos de prueba para los E2E de productos

Pega aquí las fotos que quieras usar en las pruebas de **crear** y **editar**
productos (`productos-imagenes-real.spec.ts`).

## Cómo funciona

- Los tests leen **todos** los archivos de imagen de esta carpeta
  (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`), ordenados por nombre.
- Cada vez que un test **agrega** una foto nueva, además escribe en la
  **descripción** del producto una línea `Foto agregada: <nombre-del-archivo>`.
  Esa anotación es la que se valida después (así comprobamos, de forma
  determinista, que la foto sí se incorporó).
- Cuando un test **cambia/reemplaza** una foto existente, **no** se anota nada
  en la descripción (por diseño: solo interesa validar las que se agregan).

## Semillas incluidas

Vienen tres imágenes de ejemplo (`muestra-rosa.png`, `muestra-menta.png`,
`muestra-lavanda.png`) para que los tests corran aunque no pegues nada. Puedes
borrarlas o dejarlas; si pegas tus propias fotos, se usarán junto con estas
(los tests toman las primeras según orden alfabético).

> Consejo: nombra tus fotos con un prefijo tipo `01-`, `02-`… para controlar
> qué foto entra primero.
