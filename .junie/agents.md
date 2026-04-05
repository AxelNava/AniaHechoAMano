# Instrucciones para el Agente (Agent Instructions)

- **Gestor de Paquetes**: Usa `bun` como el gestor de paquetes por defecto en este proyecto en lugar de `npm`, `yarn` o `pnpm`.
- Todas las instalaciones de dependencias, ejecuciones de scripts y comandos relacionados deben realizarse utilizando `bun` (por ejemplo: `bun install`, `bun run dev`, `bun add <paquete>`).
- El backend debe de seguir al frontent, es decir, cuando se realice una nueva vista, dependiendo de si difiere mucho
a lo que ya existe o es una característica nueva, se debe de crear un nuevo modulo para el backend
para poder tener una estructura similar al frontend y así poder debbugear de forma más sencilla.
 
## Backend
- **Estructura y arquitectura**: Cualquier controlador que se crea debe de recibir en caso de que sea necesario
 un dto para poder procesarlo en un servicio correspondiente. Luego los servicios usarán las
funciones y métodos de prisma para poder operar con la base de datos de modo que en el controlador
no se acceda a la base de datos
- **Arquitectura de imágenes**: Las imágenes se guardarán de forma temporal en una carpeta product/images
dentro de esta carpeta seguirá la estructura de categoría/nombre_producto/product_id-image_id.(extension)

## Frontend

- **Estructura y arquitectura**: En la medida de lo posible cuando se realicen varias vistas y usan los 
mismos estilos/estructuras, separar esa sección para que se realice un nuevo componente, solo en caso de que se
use más de 3 veces, preguntame cuando haya que realizar este tipo de operaciones
