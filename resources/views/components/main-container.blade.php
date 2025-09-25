<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laravel</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet"/>

    <!-- Styles / Scripts -->
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @endif
</head>
<body class="bg-[hsl(268_80_90)] grid md:grid-rows-[auto_1fr_1fr]">
<header>
    {{$header}}
    @if ($hasHeader)
        <x-navigation_header></x-navigation_header>
    @endif
</header>
{{$slot}}
{{--<x-footer/>--}}
</body>
</html>
