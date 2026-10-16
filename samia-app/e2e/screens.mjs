/**
 * بيفتح كل شاشات التطبيق ببيانات تجريبية (بدون Supabase حقيقي) وبيصوّرها.
 * الاستعمال: node e2e/screens.mjs <مجلد-الصور>
 * بيحتاج Playwright مثبّت (محلياً أو عبر PLAYWRIGHT_PATH).
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { createMockDb, installMockSupabase } from './mock-supabase.mjs'

const require = createRequire(import.meta.url)
const playwrightPath = process.env.PLAYWRIGHT_PATH ?? 'playwright'
const { chromium } = require(playwrightPath)

const outDir = process.argv[2] ?? 'e2e-shots'
mkdirSync(outDir, { recursive: true })
const port = 5174
const base = `http://localhost:${port}`

const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://demo.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'demo-anon-key',
    VITE_PUBLIC_BASE_URL: base,
    VITE_VAPID_PUBLIC_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})
server.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`))

async function waitForServer(tries = 120) {
  for (let i = 0; i < tries; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get(base + '/', (res) => {
        res.resume()
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(1000, () => {
        req.destroy()
        resolve(false)
      })
    })
    if (ok) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('vite did not start')
}

const problems = []

async function newPage(browser, db, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 2 : 1, serviceWorkers: 'block', locale: 'ar' })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(20000)
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))
  page.on('console', (m) => {
    // تحذير flushSync بييجي من @fullcalendar/react مع React 19 بوضع التطوير بس، ومش مشكلة بالتطبيق
    if (m.type() === 'error' && !/realtime|WebSocket|net::ERR|favicon|flushSync/i.test(m.text())) problems.push(`[console] ${m.text().slice(0, 300)}`)
  })
  await installMockSupabase(page, db)
  return { page, context }
}

function stamp() {
  return new Date().toISOString().slice(11, 19)
}
async function shot(page, name, full = true) {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full })
  console.log(stamp(), 'shot', name)
}

async function login(page) {
  await page.goto(base + '/login')
  await page.getByLabel('الإيميل').fill('samia@example.com')
  await page.getByLabel('كلمة السر').fill('demo1234')
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.waitForURL('**/calendar', { timeout: 15000 })
}

try {
  await waitForServer()
  const browser = await chromium.launch({ args: ['--no-proxy-server'] })
  const db = createMockDb()

  // ---------------- التلفون ----------------
  const { page, context } = await newPage(browser, db, { width: 390, height: 844 })
  await page.goto(base + '/login')
  await page.waitForSelector('text=تسجيل الدخول')
  await shot(page, 'm01-login', false)

  await login(page)
  await page.waitForSelector('.fc-timegrid', { timeout: 15000 })
  await shot(page, 'm02-calendar-week')
  await page.getByRole('tab', { name: 'يومي' }).click()
  await page.waitForTimeout(500)
  await shot(page, 'm03-calendar-day')
  await page.getByRole('tab', { name: 'قائمة' }).click()
  await page.waitForTimeout(500)
  await shot(page, 'm04-calendar-list')

  await page.goto(base + '/appointments/new')
  await page.waitForSelector('text=موعد جديد')
  await shot(page, 'm05-new-appointment')
  await page.getByLabel('بحث عن زبون').fill('ليلى')
  await page.getByRole('button', { name: /ليلى حسن/ }).click()
  await page.waitForTimeout(300)
  await shot(page, 'm06-new-appointment-filled')
  await page.getByRole('button', { name: 'احفظ' }).click()
  await page.waitForURL('**/appointments/*', { timeout: 15000 })
  await page.waitForSelector('text=انحفظ الموعد')
  await shot(page, 'm07-created-appointment')

  const pending = db.tables.appointments.find((a) => a.status === 'change_requested')
  await page.goto(`${base}/appointments/${pending.id}`)
  await page.waitForSelector('text=سجل التغييرات')
  await shot(page, 'm08-appointment-details')
  await page.getByRole('button', { name: 'غيّر الموعد' }).click()
  await page.waitForSelector('role=dialog')
  await shot(page, 'm09-reschedule-sheet', false)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'ألغي', exact: true }).click()
  await page.waitForSelector('role=dialog')
  await shot(page, 'm10-cancel-sheet', false)
  await page.keyboard.press('Escape')

  const past = db.tables.appointments.find((a) => a.status === 'attended' && a.payment_status === 'unpaid')
  await page.goto(`${base}/appointments/${past.id}`)
  await page.waitForSelector('text=الدفع')
  await page.getByRole('button', { name: 'دفع', exact: true }).click()
  await page.waitForSelector('role=dialog')
  await shot(page, 'm11-payment-sheet', false)
  await page.keyboard.press('Escape')

  await page.goto(base + '/messages')
  await page.waitForSelector('text=رسائل لازم تنبعت')
  await shot(page, 'm12-messages')
  await page.goto(base + '/follow-up')
  await page.waitForSelector('text=بدها متابعة')
  await shot(page, 'm13-follow-up')
  await page.goto(base + '/payments')
  await page.waitForSelector('text=الدفعات')
  await shot(page, 'm14-payments')
  await page.goto(base + '/clients')
  await page.waitForSelector('text=الزبائن')
  await shot(page, 'm15-clients')
  await page.goto(`${base}/clients/${db.tables.clients[0].id}`)
  await page.waitForSelector('text=المواعيد القادمة')
  await shot(page, 'm16-client-details')
  await page.goto(base + '/settings')
  await page.waitForSelector('text=قوالب الرسائل')
  await shot(page, 'm17-settings')

  // الصفحة العامة
  const token = db.demoToken
  const pub = await context.newPage()
  pub.setDefaultTimeout(15000)
  await installMockSupabase(pub, db)
  pub.on('pageerror', (e) => problems.push(`[pageerror public] ${e.message}`))
  await pub.goto(`${base}/a/${token}`)
  await pub.waitForSelector('text=موافق')
  await shot(pub, 'm18-public-invite', false)
  await pub.getByRole('button', { name: 'بدي أغيّر' }).click()
  await pub.waitForSelector('text=شو الوقت اللي بناسبك')
  await shot(pub, 'm19-public-change-form', false)
  await pub.getByRole('button', { name: 'رجوع' }).click()
  await pub.getByRole('button', { name: 'موافق' }).click()
  await pub.waitForSelector('text=تم تأكيد الموعد')
  await shot(pub, 'm20-public-confirmed', false)
  await pub.goto(`${base}/a/wrong-token-wrong-token-wrong-token`)
  await pub.waitForSelector('text=الرابط مش صالح')
  await shot(pub, 'm21-public-invalid', false)
  const cancelledAppt = db.tables.appointments.find((a) => a.status === 'cancelled')
  await pub.goto(`${base}/a/${cancelledAppt.public_token}`)
  await pub.waitForSelector('text=الجلسة ملغية')
  await shot(pub, 'm22-public-cancelled', false)

  await context.close()

  // ---------------- الكمبيوتر ----------------
  const desktop = await newPage(browser, db, { width: 1280, height: 900 })
  await login(desktop.page)
  await desktop.page.waitForSelector('.fc-timegrid', { timeout: 15000 })
  await shot(desktop.page, 'd01-calendar-week')
  await desktop.page.goto(`${base}/appointments/${pending.id}`)
  await desktop.page.waitForSelector('text=سجل التغييرات')
  await shot(desktop.page, 'd02-appointment-details')
  await desktop.page.goto(base + '/settings')
  await desktop.page.waitForSelector('text=قوالب الرسائل')
  await shot(desktop.page, 'd03-settings')
  await desktop.context.close()

  await browser.close()
} catch (err) {
  problems.push(`[script] ${err?.stack ?? err}`)
} finally {
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    server.kill('SIGTERM')
  }
  server.stdout?.destroy()
  server.stderr?.destroy()
}

if (problems.length) {
  console.log('\nPROBLEMS:')
  for (const p of problems) console.log(' -', p)
  process.exitCode = 1
} else {
  console.log('\nno console/page errors')
}
