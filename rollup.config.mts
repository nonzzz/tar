import { defineConfig } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { swc } from 'rollup-plugin-swc3'
import dts from 'rollup-plugin-dts'

export default defineConfig([{ input: 'src/index.ts',
  output: [
    { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
    { file: 'dist/index.js', format: 'cjs', exports: 'named' }
  ],
  plugins: [
    nodeResolve(),
    swc()
  ] }, {
  input: 'src/index.ts',
  output: { file: 'dist/index.d.ts' },
  plugins: [dts()]
}])
