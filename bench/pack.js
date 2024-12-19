import { createPack } from '../dist/index.mjs'
// import tarStream from 'tar-stream'

// const pack = tarStream.pack()
const pack = createPack()

const byte = new TextEncoder().encode('body { background: red; }')
pack.add(byte, { filename: 'assets/c.css' })

pack.done()
