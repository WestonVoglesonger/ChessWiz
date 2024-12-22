/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // Enable class-based dark mode
  content: [
    './src/**/*.{js,jsx}',        // Include React files
    './src/components/**/*.{js,jsx}', // Include components directory
    './public/index.html',        // Ensure entry HTML is scanned
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),      // Optional: Improves form styling
    require('@tailwindcss/typography') // Optional: Enhances typography
  ],
};
