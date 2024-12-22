import cronometro from 'cronometro'
import { encode as tarStreamEncode, encodePax as tarStreamEncodePax } from 'tar-stream/headers.js'
import { F_MODE, TypeFlag, encode as tarMiniEncode, encodePax as tarMiniEncodePax } from '../dist/index.mjs'

const filename = 'nonzzz.txt'
const content = new Uint8Array([49, 49, 49, 49])

cronometro({
  tarMini() {
    tarMiniEncode({
      name: filename,
      size: content.length,
      uid: 0,
      gid: 0,
      mtime: Math.floor(Date.now() / 1000),
      typeflag: TypeFlag.AREG_TYPE,
      linkname: '',
      devmajor: 0,
      devminor: 0,
      mode: F_MODE,
      uname: 'nonzzz',
      gname: 'admin'
    })
  },
  tarStream() {
    tarStreamEncode({
      name: filename,
      size: content.length,
      uid: 0,
      gid: 0,
      mtime: new Date(),
      linkname: '',
      devmajor: 0,
      devminor: 0,
      mode: F_MODE,
      uname: 'nonzzz',
      gname: 'admin'
    })
  },
  tarMiniPax() {
    tarMiniEncodePax({ name: 'nonzzz.tsx', linkname: '1', pax: { kanno: 'hello world' } })
  },
  tarStreamPax() {
    tarStreamEncodePax({ name: 'nonzzz.tsx', linkname: '1', pax: { kanno: 'hello world' } })
  }
})
