import Benchmark from 'benchmark'
import tarStream from 'tar-stream'
import { createPack } from '../dist/index.mjs'

const packSuite = new Benchmark.Suite('Pack')

const assets = {
  'assets/a.mjs': 'const a = 1;',
  'assets/b.mjs': 'import "./c.css"; import { a } from "./a.mjs"; console.log(a);',
  'assets/c.css': 'body { background: red; }'
}

packSuite.add('tar-stream', () => {
  const pack = tarStream.pack()
  for (const [path, content] of Object.entries(assets)) {
    pack.entry({ name: path }, new TextEncoder().encode(content))
  }
  pack.finalize()
}).add('tar-mini', () => {
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
