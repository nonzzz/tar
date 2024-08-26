import { describe, expect, it } from 'vitest'
import { ERROR_MESSAGES, F_MODE, TypeFlag, decodePax, decode as decodeTar, encode, encodePax } from '../src'
import type { EncodingHeadOptions } from '../src'

function randomDir(len: number) {
  len = len - 1
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const maxDirLength = 8

  let randomPath = ''
  let currentLength = 0

  while (currentLength < len) {
    let dirLength = Math.floor(Math.random() * maxDirLength) + 1
    if (currentLength + dirLength + 1 > len) {
      dirLength = len - currentLength - 1
      if (dirLength <= 0) break
    }

    for (let i = 0; i < dirLength; i++) {
      randomPath += charset.charAt(Math.floor(Math.random() * charset.length))
      currentLength++
    }

    if (currentLength < len - 1) {
      randomPath += '/'
      currentLength++
    }
  }

  if (randomPath.length > 0 && randomPath[randomPath.length - 1] === '/') {
    randomPath = randomPath.slice(0, randomPath.length - 1)
  }
  randomPath += '/'

  return randomPath
}

function getPrefixAndName(str: string) {
  let prefix = ''
  while (str.length > 100) {
    const spec = str.indexOf('/')
    if (spec === -1) {
      break
    }
    const range = str.slice(0, spec)
    prefix += prefix ? '/' + range : range
    str = str.slice(spec + 1)
  }
  return { prefix, name: str }
}

describe('Headers', () => {
  describe('Uniform Standard Type Archive', () => {
    describe('Encoding', () => {
      const decoder = new TextDecoder()
      const decode = decoder.decode.bind(decoder)
      const mtime = Math.floor(Date.now() / 1000)
      it('Normal', () => {
        const header = <EncodingHeadOptions>{
          name: 'foo.tsx',
          uid: 0,
          gid: 0,
          size: 1024,
          mtime,
          typeflag: TypeFlag.AREG_TYPE,
          linkname: '',
          devmajor: 0,
          devminor: 0,
          mode: F_MODE,
          uname: 'nonzzz',
          gname: 'admin'
  
        } 
  
        const block = encode(header)
        expect(block.length).toBe(512)
        expect(decode(block.subarray(0, 100)).replace(/\0+$/, '')).toBe('foo.tsx')
        expect(decode(block.subarray(265, 265 + 32)).replace(/\0+$/, '')).toBe('nonzzz')
        expect(decode(block.subarray(297, 297 + 32)).replace(/\0+$/, '')).toBe('admin')
      })
      it('Directory', () => {
        const header = <EncodingHeadOptions>{
          name: 'nao',
          uid: 0,
          gid: 0,
          size: 1024,
          mtime,
          typeflag: TypeFlag.DIR_TYPE,
          linkname: '',
          devmajor: 0,
          devminor: 0,
          mode: F_MODE,
          uname: 'nonzzz',
          gname: 'admin'
        }
        const block = encode(header)
        expect(block.length).toBe(512)
        expect(decode(block.subarray(0, 100)).replace(/\0+$/, '')).toBe('nao/')
        expect(decode(block.subarray(156, 157))).toBe(TypeFlag.DIR_TYPE)
      })
      it('Long Name File But Not Direcotry', () => {
        const filename = 'a'.repeat(98) + '.tsx'
        const header = <EncodingHeadOptions>{
          name: filename,
          uid: 0,
          gid: 0,
          size: 1024,
          mtime,
          typeflag: TypeFlag.AREG_TYPE,
          linkname: '',
          devmajor: 0,
          devminor: 0,
          mode: F_MODE,
          uname: 'nonzzz',
          gname: 'admin'
        }
        expect(() => encode(header)).toThrowError(ERROR_MESSAGES.INVALID_ENCODING_NAME)
      })
      it('Long Name With Prefix', () => {
        const dir = randomDir(100)
        const filename = 'nonzzz.tsx'
        const { prefix, name } = getPrefixAndName(dir + filename)
        const header = <EncodingHeadOptions>{
          name: dir + filename,
          uid: 0,
          gid: 0,
          size: 1024,
          mtime,
          typeflag: TypeFlag.AREG_TYPE,
          linkname: '',
          devmajor: 0,
          devminor: 0,
          mode: F_MODE,
          uname: 'nonzzz',
          gname: 'admin'
        }
       
        const block = encode(header)
        expect(block.length).toBe(512)
        expect(decode(block.subarray(0, 100)).replace(/\0+$/, '')).toBe(name)
        expect(decode(block.subarray(345, 345 + 155)).replace(/\0+$/, '')).toBe(prefix)
      })
      it('Large File', () => {
        const size = Math.pow(2, 33)
        const header = <EncodingHeadOptions>{
          name: 'nonzzz.tsx',
          uid: 0,
          gid: 0,
          size,
          mtime,
          typeflag: TypeFlag.AREG_TYPE,
          linkname: '',
          devmajor: 0,
          devminor: 0,
          mode: F_MODE,
          uname: 'nonzzz',
          gname: 'admin'
        }
        const block = encode(header)
        const { size: decodeSize } = decodeTar(block)
        expect(decodeSize).toBe(size)
      })
      it('Pax Header', () => {
        const binary = encodePax({ name: 'nonzzz.tsx', linkname: '1', pax: { kanno: 'hello world' } })
        const pax = decodePax(binary)
        expect(pax.path).toBe('nonzzz.tsx')
        expect(pax.kanno).toBe('hello world')
        expect(pax.linkpath).toBe('1')
      })
    })
  })
})
