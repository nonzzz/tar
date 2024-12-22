declare namespace NodeJS {
  interface Process {
    binding<T = object>(name: 'buffer'): T
  }
}
