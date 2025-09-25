# Proyecto Ania

Este es un proyecto de una tienda en línea para vender arreglos florales hechos a mano, como rosas eternas. La aplicación está construida con Laravel y utiliza un stack de tecnología moderno para el frontend.

## Sobre el Proyecto

El objetivo de este proyecto es crear una plataforma de comercio electrónico para mostrar y vender productos artesanales. La página de inicio muestra los productos, y hay funcionalidades para buscar y ver detalles de los productos.

### Tecnologías Utilizadas

*   **Backend:** [Laravel](https://laravel.com/)
*   **Frontend:** [React](https://reactjs.org/) con [Vite](https://vitejs.dev/)
*   **Framework Full-Stack:** [Inertia.js](https://inertiajs.com/)
*   **Estilos CSS:** [Tailwind CSS](https://tailwindcss.com/)
*   **Base de Datos:** Compatible con MySQL, PostgreSQL, SQLite.

## Primeros Pasos

Sigue estas instrucciones para tener una copia del proyecto funcionando en tu máquina local para desarrollo y pruebas.

### Prerrequisitos

Asegúrate de tener instalado lo siguiente en tu sistema:

*   PHP >= 8.4
*   Composer
*   Node.js
*   pnpm (o npm/yarn)

### Instalación

1.  **Clona el repositorio:**
    ```sh
    git clone <URL_DEL_REPOSITORIO>
    cd proyecto-laravel
    ```

2.  **Instala las dependencias de Composer:**
    ```sh
    composer install
    ```

3.  **Crea tu archivo de configuración de entorno:**
    Copia el archivo de ejemplo y configura tus variables de entorno, especialmente la conexión a la base de datos.
    ```sh
    cp .env.example .env
    ```

4.  **Genera la clave de la aplicación:**
    ```sh
    php artisan key:generate
    ```

5.  **Instala las dependencias de Node.js:**
    Se recomienda usar `pnpm` debido a la presencia de un archivo `pnpm-lock.yaml`.
    ```sh
    pnpm install
    ```

6.  **Ejecuta las migraciones y los seeders:**
    Esto creará la estructura de la base de datos y la llenará con datos de ejemplo.
    ```sh
    php artisan migrate --seed
    ```

7.  **Inicia los servidores de desarrollo:**
    *   Inicia el servidor de desarrollo de Laravel.
    *   Inicia el servidor de Vite para compilar los assets del frontend.

    Puedes ejecutar ambos con los siguientes comandos en terminales separadas:
    ```sh
    # Terminal 1: Servidor de Laravel
    php artisan serve
    ```
    ```sh
    # Terminal 2: Servidor de Vite
    pnpm run dev
    ```

    Ahora puedes acceder a la aplicación en `http://localhost:8000`.

## Ejecución de Pruebas

Para ejecutar la suite de pruebas automatizadas, utiliza el siguiente comando de Artisan:

```sh
php artisan test
```

Esto ejecutará las pruebas unitarias y de características definidas en el directorio `tests/`.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.