/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                kindred: ['kindred', 'sans-serif'],
            },
            colors: {
                brand: {
                    black: '#000000',
                    orange: '#000000',
                    gold: '#FFD700',
                    dark: '#111111',
                    darker: '#0a0a0a',
                    light: '#F9FAFB',
                    white: '#FFFFFF'
                },
                glass: {
                    light: 'rgba(255, 255, 255, 0.7)',
                    dark: 'rgba(0, 0, 0, 0.05)',
                    border: 'rgba(0, 0, 0, 0.05)'
                }
            },
            backgroundImage: {
                'brand-gradient': 'linear-gradient(135deg, #FF7B00 0%, #FFD700 100%)',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'hero-zoom': {
                    '0%':   { transform: 'scale(1)' },
                    '100%': { transform: 'scale(1.12)' },
                },
            },
            animation: {
                marquee: 'marquee 25s linear infinite',
                'hero-zoom': 'hero-zoom 12s ease-in-out infinite alternate',
            }
        },
    },
    plugins: [
        function ({ addUtilities }) {
            addUtilities({
                '.perspective-1000': {
                    perspective: '1000px',
                },
                '.rotate-x-0': {
                    transform: 'rotateX(0deg)',
                },
                '.-rotate-x-12': {
                    transform: 'rotateX(-12deg)',
                },
            })
        },
    ],
}
