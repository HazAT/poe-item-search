export default {
  plugins: {
    // Keep Tailwind 3: v4 requires document-level @property registrations,
    // while extension styles stay inside Shadow DOM. See tailwindlabs/tailwindcss#15005.
    tailwindcss: {},
    autoprefixer: {},
  },
};
