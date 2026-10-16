/** توكن الرابط العام: 32 بايت عشوائية بصيغة base64url (نفس صيغة قاعدة البيانات) */
export function generatePublicToken(randomBytes: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = randomBytes(32)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function defaultRandom(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return bytes
}
