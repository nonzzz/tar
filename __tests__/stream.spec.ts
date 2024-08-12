import { Writable } from 'stream'
import { describe, expect, it } from 'vitest'
import { createPack } from '../src'

describe('Stream', () => {
  describe('Uniform Standard Type Archive', () => {
    describe('Pack', () => {
      it('Normal', async () => {
        const assets = {
          'assets/a.mjs': 'const a = 1;',
          'assets/b.mjs': 'import "./c.css"; import { a } from "./a.mjs"; console.log(a);',
          'assets/c.css': 'body { background: red; }'
        }
        const pack = createPack()

        let expectByteLen = 0
        let actualByteLen = 0

        for (const [path, content] of Object.entries(assets)) {
          pack.add(new TextEncoder().encode(content), {
            filename: path
          })
          expectByteLen += content.length
          expectByteLen += 512 - (content.length % 512)
          expectByteLen += 512
        }
        expectByteLen += 1024
        pack.done()
        const writer = new Writable({
          write(chunk, encoding, callback) {
            actualByteLen += chunk.length
            callback()
          }
        })
        pack.receiver.pipe(writer)
        await new Promise((resolve) => writer.on('finish', resolve))
        expect(actualByteLen).toBe(expectByteLen)
      })
    })
  })
})
