import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: {
    css: true,
    html: true,
    markdown: true,
  },
  ignores: [
    'core',
    'coverage',
    'dist',
    '.npm',
  ],
})
