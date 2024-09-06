# TarMini

It's an implementation based on the `ustar` format. This package only provides low-level API's.

### Usage

```ts
// packing
import { createPack, createExtract } from 'tar-mini'

const pack = createPack()

pack.add(new Uint8Array(512), {
  // options
})

pack.done()

// extracting

const extract = createExtract()

extract.on('entry', (head, file) => {
  // todo
})

pack.receiver.pipe(extract.receiver)
```

### Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg"/>
  </a>
</p>

### Related

- [tar](https://www.gnu.org/software/tar/manual/html_node/Standard.html)
- [pax](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_03)

### Others

> Why another ustar format lib?
> Alough `tar-stream` is useful, we won't need so many dependencies for higher version of NodeJs. And this library is lightweight and can handle simple scenes.

### Scenes

- [@compilets/untar-url](https://github.com/compilets/untar-url)
- [vite-plugin-compression2](https://github.com/nonzzz/vite-plugin-compression)

### LICENSE

[MIT](./LICENSE)

### Author

Kanno
