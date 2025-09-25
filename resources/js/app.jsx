import {React, StrictMode} from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent} from 'laravel-vite-plugin/inertia-helpers'


createInertiaApp({
    resolve: name => resolvePageComponent(`./pages/${name}.jsx`, import.meta.glob([
        './pages/**/*.jsx',
        '../images/**',
        // '../fonts/**'
    ])),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<StrictMode><App {...props} /></StrictMode>)
    },
})
