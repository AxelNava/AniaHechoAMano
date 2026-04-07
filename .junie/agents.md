# Instrucciones para el Agente (Agent Instructions)

- **Gestor de Paquetes**: Usa `bun` como el gestor de paquetes por defecto en este proyecto en lugar de `npm`, `yarn` o `pnpm`.
- Todas las instalaciones de dependencias, ejecuciones de scripts y comandos relacionados deben realizarse utilizando `bun` (por ejemplo: `bun install`, `bun run dev`, `bun add <paquete>`).
 
## Frontend

- **Estructura y arquitectura**: En la medida de lo posible cuando se realicen varias vistas y usan los 
mismos estilos/estructuras, separar esa sección para que se realice un nuevo componente, solo en caso de que se
use más de 3 veces, preguntame cuando haya que realizar este tipo de operaciones
