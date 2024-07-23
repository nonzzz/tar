// https://www.gnu.org/software/tar/manual/html_section/Formats.html
// Only need pack is enough. (ustar)
// No gnu or old gnu or v7 and oters etc.
// POSIX.1-1988
// https://www.gnu.org/software/tar/manual/tar.html#Blocking-Factor

open Unicode
type u8 = Js.Typed_array.Uint8Array.t

// https://www.gnu.org/software/tar/manual/html_node/Standard.html
type posixHead = {
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

@genType
type headOptions = {
  name: string,
  mode: int,
  uid: int,
  gid: int,
  size: int,
  mtime: int,
  chksum: int,
  typeflag: string,
  linkname: string,
  magic: string,
  version: string,
  uname: string,
  gname: string,
  devmajor: int,
  devminor: int,
  prefix: string,
}

type typeFlag = {
  reg_type: string,
  areg_type: string,
  link_type: string,
  sym_type: string,
  chr_type: string,
  blk_type: string,
  dir_type: string,
  fifo_type: string,
  cont_type: string,
}

let typeFlag = {
  reg_type: "0",
  areg_type: "\0",
  link_type: "1",
  sym_type: "2",
  chr_type: "3",
  blk_type: "4",
  dir_type: "5",
  fifo_type: "6",
  cont_type: "7",
}

type headResult = {options: headOptions, block: u8}

// We using 512 bytes as the block size.

module Head = {
  let make = (userOptions: option<headOptions>): headResult => {
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

let setU8ArrayWithOffset = (block: u8, offset: int, value: u8): u8 => {
  let length = value->Js.Typed_array.Uint8Array.length
  for i in 0 to length - 1 {
    let i = value->Js.Typed_array.Uint8Array.unsafe_get(i)
    block->Js.Typed_array.Uint8Array.unsafe_set(i, offset + i)
  }
  block
}

// For better tree shaking.
external arryLike: u8 => array<int> = "%identity"

external land: (int, int) => int = "%andint"

let encode = (options: option<headOptions>) => {
  let head = Head.make(options)
  let {block, options} = head
  let {typeflag, linkname, mode, uname, gname, gid, uid, devmajor, devminor, mtime} = options
  let name = ref({
    if (
      typeflag == typeFlag.dir_type &&
        (options.name->Js.String.length - 1)->Js.String.charAt(options.name) != "/"
    ) {
      options.name ++ "/"
    } else {
      options.name
    }
  })
  let prefix = ref("")
  let binaryName = ref(Utf8.encode(name.contents))
  if binaryName.contents->Js.Typed_array.Uint8Array.length != name.contents->Js.String.length {
    None
  } else {
    let invalidate = ref(false)
    while name.contents->Js.String.length > 100 {
      let spec = "/"->Js.String.indexOf(name.contents)
      switch spec {
      | -1 => invalidate := true
      | _ => {
          let range = name.contents->Js.String.slice(~from=0, ~to_=spec)
          prefix := if prefix.contents->Js.String.length > 0 {
              "/" ++ range
            } else {
              range
            }
          name :=
            name.contents->Js.String.slice(~from=spec + 1, ~to_=name.contents->Js.String.length)
        }
      }
    }
    switch invalidate.contents {
    | true => None
    | _ =>
      // Fix binaryName again.
      binaryName := if (
          binaryName.contents->Js.Typed_array.Uint8Array.length !== name.contents->Js.String.length
        ) {
          Utf8.encode(name.contents)
        } else {
          binaryName.contents
        }
      let lengthOverflow =
        binaryName.contents->Js.Typed_array.Uint8Array.length +
          prefix.contents->Js.String.length > 255
      let linkname = linkname->Utf8.encode
      let linkNameOverflow = linkname->Js.Typed_array.Uint8Array.length > 100
      if lengthOverflow || linkNameOverflow {
        None
      } else {
        binaryName.contents->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(0, block)
        // mode
        mode
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(100, block)
        // uid
        uid
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(108, block)
        // gid
        gid
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(116, block)

        // size
        // let octalSize =
        // if size->Octal.encode(None)->Js.String.length > 11 {
        //   //  big ending
        //   let overflowSize = ref(size)
        //   let t: array<int> = []
        //   for i in 11 downto 0 {
        //     overflowSize := Js.Math.floor_int(overflowSize.contents / 0x100)
        //     // t.push(land(overflowSize.contents, 0xff))
        //     // t->Array.push(land(overflowSize.contents, 0xff))
        //   }
        // }

        // mtime
        mtime
        ->Octal.encode(Some(11))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(136, block)
        // typeflag
        ("0" ++ typeflag)
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(156, block)
        if options.linkname->Js.String.length > 0 {
          linkname->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(157, block)
        }
        // magic and version
        "ustar"->Utf8.encode->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(257, block)
        "00"->Utf8.encode->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(263, block)

        if uname->Js.String.length > 0 {
          uname->Utf8.encode->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(265, block)
        }
        if gname->Js.String.length > 0 {
          gname->Utf8.encode->arryLike->Js.Typed_array.Uint8Array.setArrayOffset(297, block)
        }

        devmajor
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(329, block)

        devminor
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(337, block)

        if prefix.contents->Js.String.length > 0 {
          prefix.contents
          ->Utf8.encode
          ->arryLike
          ->Js.Typed_array.Uint8Array.setArrayOffset(345, block)
        }

        // chksum
        let chksum = Js.Typed_array.Uint8Array.reducei((acc, v, i) => {
          if i >= 148 && i < 156 {
            acc + 32
          } else {
            acc + v
          }
        }, 0, block)
        chksum
        ->Octal.encode(Some(6))
        ->Utf8.encode
        ->arryLike
        ->Js.Typed_array.Uint8Array.setArrayOffset(148, block)

        Some(block)
      }
    }
  }
}
