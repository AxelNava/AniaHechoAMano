<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Laravel</title>

    <!-- Fonts -->
    <!-- Local fonts are loaded via CSS -->

    <!-- Styles / Scripts -->
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @endif
</head>
<body class="grid grid-rows-[auto_2fr_auto]">
<x-navigation_header></x-navigation_header>
<main class="min-h-[60dvh] bg-secondary">
{{--    <x-primary-logo is-main-title="true"></x-primary-logo>--}}
</main>
<x-footer></x-footer>
</body>
</html>
