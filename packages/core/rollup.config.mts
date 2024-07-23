import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { swc } from 'rollup-plugin-swc3'

export default defineConfig({
  input: 'lib/es6/src/index.mjs',
  output: [
    { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
    { file: 'dist/index.js', format: 'cjs', exports: 'named' }
  ],
  plugins: [
    nodeResolve(),
    swc()
  ]
})
