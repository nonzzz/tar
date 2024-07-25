import { describe, expect, it } from 'vitest'
import { encode, typeFlag } from '../dist'
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
        typeflag: typeFlag.areg_type,
        linkname: '',
        devmajor: 0,
        devminor: 0,
        mode: 0o755,
        uname: 'nonzzz',
        gname: 'admin'

      } 
      const block = encode(header)
      expect(new TextDecoder().decode(block.subarray(0, 100)).replace(/\0+$/, '')).toBe('foo.tsx')
    })
  })
})
