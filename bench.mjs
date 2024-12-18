import Benchmark from 'benchmark'
import { createPack } from './dist/index.mjs'

const suite = new Benchmark.Suite()

const assets = {
  'assets/a.mjs': 'const a = 1;',
  'assets/b.mjs': 'import "./c.css"; import { a } from "./a.mjs"; console.log(a);',
  'assets/c.css': 'body { background: red; }'
}

suite.add('Pack', () => {
  const pack = createPack()
  for (const [path, content] of Object.entries(assets)) {
    pack.add(new TextEncoder().encode(content), {
      filename: path
    })
  }
  pack.done()
})
  .on('cycle', function(event) {
    console.log(String(event.target))
  })
  .run({ 'async': true })
