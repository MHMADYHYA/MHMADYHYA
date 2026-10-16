#!/usr/bin/env node
/**
 * توليد مفاتيح VAPID للتنبيهات (Web Push) بدون أي مكتبة خارجية.
 * شغّله مرة وحدة: npm run vapid
 * - المفتاح العام بينحط بملف .env (VITE_VAPID_PUBLIC_KEY)
 * - الزوج كامل (JSON) بينحط بأسرار Supabase باسم VAPID_KEYS (انظر docs/NOTIFICATIONS_SETUP.md)
 */
import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pubJwk = publicKey.export({ format: 'jwk' })
const privJwk = privateKey.export({ format: 'jwk' })

// المفتاح العام بصيغة raw (65 بايت) base64url، وهي الصيغة اللي بدها إياها المتصفحات
const x = Buffer.from(pubJwk.x, 'base64url')
const y = Buffer.from(pubJwk.y, 'base64url')
const raw = Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url')

const vapidKeys = {
  publicKey: { kty: 'EC', crv: 'P-256', x: pubJwk.x, y: pubJwk.y, key_ops: ['verify'], ext: true },
  privateKey: { kty: 'EC', crv: 'P-256', x: pubJwk.x, y: pubJwk.y, d: privJwk.d, key_ops: ['sign'], ext: true },
}

console.log('\n1) حط هاد السطر بملف .env (المفتاح العام، مسموح يكون بالواجهة):\n')
console.log(`VITE_VAPID_PUBLIC_KEY=${raw}`)
console.log('\n2) حط هاد السر بـ Supabase (Edge Functions → Secrets) باسم VAPID_KEYS، القيمة كلها سطر واحد:\n')
console.log(JSON.stringify(vapidKeys))
console.log('\nتحذير: السر رقم 2 فيه المفتاح الخاص. ما تحطه بالواجهة ولا ترفعه على Git.\n')
