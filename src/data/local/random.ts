// Unguessable tokens for magic links and passport links.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function randomToken(length = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let token = ''
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length]
  return token
}
