/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul como cor primária de ação (substitui o roxo/índigo anterior)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Fundo creme/bege suave, no estilo do app de referência
        cream: {
          DEFAULT: '#f7f4ed',
          100: '#f2eee3',
          200: '#eae4d4',
        },
        surface: {
          light: '#ffffff',
          dark: '#14161c',
        },
        // Cor de apoio (verde-água) para elementos secundários de destaque
        accent: {
          DEFAULT: '#0ea5a3',
          light: '#ccfbf1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
