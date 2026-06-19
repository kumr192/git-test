export function nanoid(size = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomValues = new Uint8Array(size)
  crypto.getRandomValues(randomValues)
  for (const byte of randomValues) {
    result += chars[byte % chars.length]
  }
  return result
}
