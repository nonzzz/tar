import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    watch: false,
    testTimeout: 8000,
    coverage: {
      include: [
        '__tests__/**/*.{test,spec}.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/example/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
      ]
    }
  }
})
