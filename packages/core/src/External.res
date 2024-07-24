// Alought rescript provide offical Uin8Array module, but it's big for chunk.
// So we make a simple one for our own use.(For better tree shaking)

module Uint8Array = {
  type elt = int
  type typed_array<'a>
  type t = typed_array<elt>
  @get external length: t => int = "length"

  @get_index external get: (t, int) => elt = ""
  @get_index external unsafe_get: (t, int) => option<elt> = ""

  external array_like: t => array<'a> = "%identity"

  @new external fromLength: int => t = "Uint8Array"

  @send external setArrayOffset: (~form: t, ~to: t, ~offset: int) => unit = "set"

  let setArrayOffset = (dst: t, src: t, offset: int): unit => {
    setArrayOffset(~form=src, ~to=dst, ~offset)
  }

  @send external reducei: (t, (. 'b, elt, int) => 'b, 'b) => 'b = "reduce"

  @send external subarray: (t, int, int) => t = "subarray"
}

external land: (int, int) => int = "%andint"

// https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder
// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder

type decoder = {decode: Uint8Array.t => string}

type encoder = {encode: string => Uint8Array.t}

module TextDecoder = {
  %%private(@new external _make: 'a => decoder = "TextDecoder")
  let make = _make
}

module TextEncoder = {
  %%private(@new external _make: 'a => encoder = "TextEncoder")
  let make = _make
}

%%private(let _decoder: decoder = TextDecoder.make())

%%private(let _encoder: encoder = TextEncoder.make())

type textDecodeOptions = {
  encoding: string,
  fatal: bool,
  ignoreBOM: bool,
}

let textEncode = (s: string) => s->_encoder.encode
let textDecode = (u8: Uint8Array.t) => u8->_decoder.decode
let textDecodeWithOptions = (u8: Uint8Array.t, options: option<textDecodeOptions>) => {
  switch options {
  | None => textDecode(u8)
  | Some({encoding, fatal, ignoreBOM}) => {
      let decoder = TextDecoder.make({encoding, fatal, ignoreBOM})
      u8->decoder.decode
    }
  }
}

let octalEncode = (u: int, fixed: option<int>) => {
  let o = u->Js.Int.toStringWithRadix(~radix=8)
  switch fixed {
  | None => o
  | Some(cap) => {
      let l = o->Js.String.length
      if l <= cap {
        (cap - l)->Js.String.repeat("0") ++ o ++ " "
      } else {
        cap->Js.String.repeat("7") ++ " "
      }
    }
  }
}

type octalDecodeOptions = {offset: option<int>, len: int}

let parse256 = (b: Uint8Array.t) => {
  let positive = switch b->Uint8Array.unsafe_get(0) {
  | None => None
  | Some(byte) =>
    switch byte {
    | 0x80 => Some(true)
    | 0xff => Some(false)
    | _ => None
    }
  }
  switch positive {
  | None => None
  | Some(p) => {
      let tuple = Belt.Array.make(b->Uint8Array.length - 1, 0)
      for i in tuple->Belt.Array.length - 1 downto 0 {
        let byte = b->Uint8Array.get(i)
        if p {
          let _ = tuple->Belt.Array.set(b->Uint8Array.length - i - 1, byte)
        } else {
          let _ = tuple->Belt.Array.set(b->Uint8Array.length - i - 1, 0xff - byte)
        }
      }
      let sum = ref(0)
      let l = tuple->Belt.Array.length
      for i in 0 to l - 1 {
        sum :=
          sum.contents +
          Belt.Array.getExn(tuple, i) *
          Js.Math.pow_float(~base=256->Belt.Int.toFloat, ~exp=i->Belt.Int.toFloat)->Belt.Float.toInt
      }
      Some(
        switch p {
        | true => sum.contents
        | false => -1 * sum.contents
        },
      )
    }
  }
}

let clamp = (index, len, defaultValue) => {
  if index->Js.typeof != "number" {
    defaultValue
  } else if index >= len {
    len
  } else if index >= 0 {
    index
  } else {
    let index = index + len
    if index >= 0 {
      index
    } else {
      0
    }
  }
}

let indexOf = (block, num, offset, end_) => {
  let rec loop = offset => {
    if offset >= end_ {
      end_
    } else if Belt.Array.getExn(block, offset) === num {
      offset
    } else {
      loop(offset + 1)
    }
  }
  loop(offset)
}

let octalDecode = (b: Uint8Array.t, options: octalDecodeOptions) => {
  let offset = switch options.offset {
  | None => 0
  | Some(o) => o
  }

  switch b->Uint8Array.unsafe_get(offset) {
  | None => Error.make("Internal error: 'octalDecode' out of bounds.")->Error.raise
  | Some(byte) =>
    if byte->land(0x80) > 0 {
      parse256(b)
    } else {
      let mutOffset = ref(offset)
      let range = b->Uint8Array.subarray(mutOffset.contents, mutOffset.contents + options.len)
      while (
        mutOffset.contents < range->Uint8Array.length &&
          range->Uint8Array.get(mutOffset.contents) == 32
      ) {
        mutOffset := mutOffset.contents + 1
      }

      let end =
        range
        ->Uint8Array.array_like
        ->indexOf(32, mutOffset.contents, b->Uint8Array.length)
        ->clamp(range->Uint8Array.length, range->Uint8Array.length)

      while mutOffset.contents < end && range->Uint8Array.get(mutOffset.contents) == 0 {
        mutOffset := mutOffset.contents + 1
      }

      Some(
        if end === mutOffset.contents {
          0
        } else {
          range
          ->Uint8Array.subarray(mutOffset.contents, end)
          ->textDecode
          ->Float.parseInt
          ->Float.toInt
        },
      )
    }
  }
}

let strDecode = (b: Uint8Array.t, offset: int, len: int, encoding: option<string>) => {
  let encoding = switch encoding {
  | None => "utf-8"
  | Some(e) => e
  }

  b
  ->Uint8Array.subarray(offset, b->Uint8Array.array_like->indexOf(0, offset, offset + len))
  ->textDecodeWithOptions(Some({encoding, ignoreBOM: false, fatal: false}))
  ->Some
}
