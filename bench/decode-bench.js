import cronometro from 'cronometro'
import { decode as tarStreamDecode } from 'tar-stream/headers.js'
import { F_MODE, TypeFlag, decode as tarMiniDecode, encode } from '../dist/index.mjs'

const filename = 'nonzzz.txt'
const content = new Uint8Array([49, 49, 49, 49])

const header = encode({
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

cronometro({
  tarMini() {
    tarMiniDecode(header, { filenameEncoding: 'utf8' })
  },
  tarStream() {
    tarStreamDecode(header, 'utf8', false)
  }
})
