import { describe, expect, it } from 'vitest'
import { encode } from '../dist'
import type { HeadOptions } from '../dist'

describe('Headers', () => {
  describe('Uniform Standard Type Archive', () => {
    it('Encoding', () => {
      const mtime = Math.floor(Date.now() / 1000)
      const header = <HeadOptions>{
        name: 'foo.tsx',
        uid: 0,
        gid: 0,
        size: 1024,
        mtime,
        typeflag: '\0',
        linkname: '',
        devmajor: 0,
        devminor: 0,
        mode: 0o755,
        uname: 'nonzzz',
        gname: 'admin'

      } 

      const decoder = new TextDecoder()

      const decode = decoder.decode.bind(decoder)

      const block = encode(header)
      expect(block.length).toBe(512)
      expect(decode(block.subarray(0, 100)).replace(/\0+$/, '')).toBe('foo.tsx')
      expect(decode(block.subarray(265, 265 + 32)).replace(/\0+$/, '')).toBe('nonzzz')
      expect(decode(block.subarray(297, 297 + 32)).replace(/\0+$/, '')).toBe('admin')
    })
  })
})
