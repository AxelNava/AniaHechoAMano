<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

    <title >Ania - Hecho a Mano</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/pages/{$page['component']}.jsx"])
    @inertiaHead
</head>
<body>
@inertia
</body>
</html>
