import fs from 'fs'
import fsp from 'fs/promises'
import { create, destroy } from 'memdisk'
import path from 'path'
import { Readable, Writable } from 'stream'
import { x } from 'tinyexec'
import zlib from 'zlib'

import { afterAll, describe, expect, it } from 'vitest'
import { TypeFlag, createExtract, createPack } from '../src'

const fixturesPath = path.join(__dirname, 'fixtures')

async function readAll(entry: string) {
  const paths = await Promise.all((await fsp.readdir(entry)).map((dir) => path.join(entry, dir)))
  let pos = 0
  const result: string[] = []
  while (pos !== paths.length) {
    const dir = paths[pos]
    const stat = await fsp.stat(dir)
    if (stat.isDirectory()) {
      const dirs = await fsp.readdir(dir)
      paths.push(...dirs.map((sub) => path.join(dir, sub)))
    }
    if (stat.isFile()) {
      result.push(dir)
    }
    pos++
  }
  return result
}

describe('Stream', () => {
  describe('Uniform Standard Type Archive', () => {
    const ramDiskPath = create.sync('tar-mini-stream', 64 * 1024 * 1024, { quiet: false })
    afterAll(() => {
      destroy.sync(ramDiskPath, { quiet: false })
    })
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
          write(chunk: Buffer, _, callback) {
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
      it('Normal', () => {
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

      it('@LongLink GNU tar', async () => {
        const nodeTar = path.join(fixturesPath, 'node-v22.7.0.tar.gz')
        const targetPath = path.join(ramDiskPath, '@LongLinkGunTar')
        const output = path.join(targetPath, 'node-v22.7.0')
        fs.mkdirSync(targetPath, { recursive: true })
        await x('tar', [`-xzf${nodeTar}`, `-C${targetPath}`])
        const files = await readAll(output)
        const extract = createExtract()
        let c = 0
        extract.on('entry', (head) => {
          if (head.typeflag === TypeFlag.REG_TYPE) {
            c += 1
          }
        })

        const p = await new Promise((resolve) => {
          const reader = fs.createReadStream(nodeTar)
          const binary: Uint8Array[] = []
          reader.pipe(zlib.createUnzip()).on('data', (c: Uint8Array) => binary.push(c)).on('end', () => {
            const buffer = Buffer.concat(binary)
            resolve(buffer)
          })
        })
        extract.receiver.write(p)
        extract.receiver.end()

        await new Promise((resolve) => extract.on('close', resolve))
        await fsp.rm(targetPath, { recursive: true })
        expect(c).toBe(files.length)
      })
      it('@LongLink GNU tar2', async () => {
        const nodeTar = path.join(fixturesPath, 'node-v22.7.0.tar.gz')
        const targetPath = path.join(ramDiskPath, '@LongLinkGunTar2')
        const output = path.join(targetPath, 'node-v22.7.0')
        fs.mkdirSync(targetPath, { recursive: true })
        await x('tar', [`-xzf${nodeTar}`, `-C${targetPath}`])
        const files = await readAll(output)
        const extract = createExtract()
        let c = 0
        extract.on('entry', (head) => {
          if (head.typeflag === TypeFlag.REG_TYPE) {
            c += 1
          }
        })

        const reader = fs.createReadStream(nodeTar)
        reader.pipe(zlib.createUnzip()).pipe(extract.receiver)

        await new Promise((resolve) => extract.on('close', resolve))
        await fsp.rm(targetPath, { recursive: true })
        expect(c).toBe(files.length)
      })
      it('Pax Header with Global Extended Header Data', async () => {
        const tarSource = path.join(fixturesPath, 'vite-plugin-compression-1.2.0.tar.gz')
        const targetPath = path.join(ramDiskPath, 'PaxHeaderWithGlobalExtendedHeaderData')
        const output = path.join(targetPath, 'vite-plugin-compression-1.2.0')
        fs.mkdirSync(targetPath, { recursive: true })
        await x('tar', [`-xzf${tarSource}`, `-C${targetPath}`])
        const files = await readAll(output)
        const extract = createExtract()
        let c = 0
        extract.on('entry', (head) => {
          if (head.typeflag === TypeFlag.REG_TYPE) {
            c += 1
          }
        })

        const reader = fs.createReadStream(tarSource)
        reader.pipe(zlib.createUnzip()).pipe(extract.receiver)

        await new Promise((resolve) => extract.on('close', resolve))
        await fsp.rm(targetPath, { recursive: true })
        expect(c).toBe(files.length)
      })
      it('From browser stream', async () => {
        const sourcePath = 'https://github.com/nonzzz/squarified/archive/refs/tags/v0.1.1.tar.gz'
        const resp = await fetch(sourcePath)
        // @ts-expect-error safe
        const reader = Readable.fromWeb(resp.body)
        const extract = createExtract()
        reader.pipe(zlib.createUnzip()).pipe(extract.receiver)
        let errorOccurred = false
        await new Promise((resolve, reject) => {
          extract.on('close', resolve)
          extract.on('error', (e) => {
            errorOccurred = true
            reject(e)
          })
        })
        expect(errorOccurred).toBe(false)
      }, { timeout: 60000 })
    })
  })
})
