/* eslint-disable no-use-before-define */
class Elt<T> {
  items: Array<T | undefined>
  pos: number
  mask: number
  rev: number
  next: Elt<T> | null
  constructor(cap: number) {
    this.items = new Array<T>(cap)
    this.pos = 0
    this.rev = 0
    this.mask = cap - 1
    this.next = null
  }

  get leak() {
    return this.items[this.pos] !== undefined
  }

  push(element: T) {
    this.items[this.pos] = element
    this.pos = (this.pos + 1) & this.mask
  }

  shift() {
    const first = this.items[this.rev]
    if (first === undefined) { return undefined }
    this.items[this.rev] = undefined
    this.rev = (this.rev + 1) & this.mask
    return first
  }

  peek() {
    return this.items[this.rev]
  }
}

// A fast list implementation
export class List<T> {
  private cap: number
  private head: Elt<T>
  private tail: Elt<T>
  length: number
  constructor(cap: number = 16) {
    this.cap = cap
    this.length = 0
    this.head = new Elt(this.cap)
    this.tail = this.head
  }

  push(elt: T) {
    if (this.head.leak) {
      const prev = this.head
      prev.next = new Elt(this.head.items.length * 2)
      this.head = prev.next
    }
    this.head.push(elt)
    this.length++
  }

  shift() {
    if (this.length !== 0) { this.length-- }
    const value = this.tail.shift()
    if (value === undefined && this.tail.next) {
      const next = this.tail.next
      this.tail.next = null
      this.tail = next
      return this.tail.shift()
    }
    return value
  }

  peek() {
    const v = this.tail.peek()
    if (v === undefined && this.tail.next) {
      return this.tail.next.peek()
    }
    return v
  }
}

export function createList<T>(cap?: number) {
  return new List<T>(cap || 16)
}
