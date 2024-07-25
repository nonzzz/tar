import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
  {
    test: {
      config: './packages/core/vitest.config.mts'
    }
  }
])
