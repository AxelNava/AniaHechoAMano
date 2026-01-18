<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>Ania - Hecho a Mano</title>

    <!-- Fonts -->
    <!-- Local fonts are loaded via CSS -->

    <!-- Styles / Scripts -->
    @viteReactRefresh
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/pages/{$page['component']}.jsx"])
    @endif
    @inertiaHead
</head>
<body >
@inertia
</body>

</html>
