// Alought rescript provide offical Uin8Array module, but it's big for chunk.
// So we make a simple one for our own use.(For better tree shaking)

module Uint8Array = {
  type elt = int
  type typed_array<'a>
  type t = typed_array<elt>
  @get external length: t => int = "length"

  @get_index external get: (t, int) => option<elt> = ""

  @new external fromLength: int => t = "Uint8Array"

  @send external setArrayOffset: (~form: t, ~to: t, ~offset: int) => unit = "set"

  let setArrayOffset = (dst: t, src: t, offset: int): unit => {
    setArrayOffset(~form=src, ~to=dst, ~offset)
  }

  @send external reducei: (t, (. 'b, elt, int) => 'b, 'b) => 'b = "reduce"
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

let textEncode = (s: string) => s->_encoder.encode
let textDecode = (u8: Uint8Array.t) => u8->_decoder.decode

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

type ocatalDecodeOptions = {offset: option<int>, len: int}

let octalDecode = (b: Uint8Array.t, options: ocatalDecodeOptions) => {
  let offset = switch options.offset {
  | None => 0
  | Some(o) => o
  }

  switch b->Uint8Array.get(offset) {
  | None => Js.log("x")
  | Some(byte) => Js.log(byte)
  }
}
