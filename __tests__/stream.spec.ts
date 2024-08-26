import { Writable } from 'stream'
import { describe, expect, it } from 'vitest'
import { createExtract, createPack } from '../src'

describe('Stream', () => {
  describe('Uniform Standard Type Archive', () => {
    const assets: Record<string, string> = {
      'assets/a.mjs': 'const a = 1;',
      'assets/b.mjs': 'import "./c.css"; import { a } from "./a.mjs"; console.log(a);',
      'assets/c.css': 'body { background: red; }'
    }
    describe('Pack', () => {
      it('Normal', async () => {
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
          write(chunk, _, callback) {
            actualByteLen += chunk.length
            callback()
          }
        })
        pack.receiver.pipe(writer)
        await new Promise((resolve) => writer.on('finish', resolve))
        expect(actualByteLen).toBe(expectByteLen)
      })
    })
    describe('Extract', () => {
      it('Normal', async () => {
        const pack = createPack()
        const extract = createExtract()
        const textDecode = new TextDecoder()
        for (const [path, content] of Object.entries(assets)) {
          pack.add(new TextEncoder().encode(content), {
            filename: path
          })
        }

        pack.done()

        extract.on('entry', (head, file) => {
          const content = assets[head.name]
          expect(content).toBe(textDecode.decode(file))
          expect(head.size).toBe(content.length)
        })
        pack.receiver.pipe(extract.receiver)
      })
    })
  })
})
