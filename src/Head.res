// https://www.gnu.org/software/tar/manual/html_section/Formats.html
// Only need pack is enough. (ustar)
// No gnu or old gnu or v7 and oters etc.
// POSIX.1-1988
// https://www.gnu.org/software/tar/manual/tar.html#Blocking-Factor

type u8 = Js.Typed_array.Uint8Array.t

// https://www.gnu.org/software/tar/manual/html_node/Standard.html
type headOptons = {
  name: u8, // fixedLength 100 offeset 0
  mode: u8, // fixedLength 8 offeset 100
  uid: u8, // fixedLength 8 offeset 108
  gid: u8, // fixedLength 8 offeset 116
  size: u8, // fixedLength 12 offeset 124
  mtime: u8, // fixedLength 12 offeset 136
  chksum: u8, // fixedLength 8 offeset 148
  typeflag: u8, // fixedLength 1 offeset 156
  linkname: u8, // fixedLength 100 offeset 157
  magic: u8, // fixedLength 6 offeset 257
  version: u8, // fixedLength 2 offeset 263
  uname: u8, // fixedLength 32 offeset 265
  gname: u8, // fixedLength 32 offeset 297
  devmajor: u8, // fixedLength 8 offeset 329
  devminor: u8, // fixedLength 8 offeset 337
  prefix: u8, // fixedLength 155 offeset 345
}

type headResult = {options: headOptons, block: u8}

// We using 512 bytes as the block size.

module Head = {
  let make = (userOptions: option<headOptons>): headResult => {
    let options = switch userOptions {
    | Some(opts) => opts
    | None => {
        let err = Error.make("No options provided")
        err->Error.raise
      }
    }
    {options, block: 512->Js.Typed_array.Uint8Array.fromLength}
  }
}

// For better tree shaking.

let encode = (options: option<headOptons>) => {
  let head = Head.make(options)
  let {block, options} = head
}
