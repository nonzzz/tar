import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import { minify, swc } from 'rollup-plugin-swc3'
import dts from 'rollup-plugin-dts'

export default defineConfig([{
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.mjs', format: 'esm', exports: 'named' },
    { file: 'dist/index.js', format: 'cjs', exports: 'named' }
  ],
  plugins: [
    swc(),
    minify({ mangle: true, compress: true, module: true })
  ],
  external: builtinModules
}, {
  input: 'src/index.ts',
  output: { file: 'dist/index.d.ts' },
  plugins: [dts()]
}])
