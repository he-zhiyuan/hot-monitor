/**
 * 排序规则集成测试
 * 运行方式：npx tsx src/test-sort.ts
 *
 * 使用独立的 test.db，测试完自动清理。
 * 验证四种排序规则（heat / time / published / sources）返回顺序正确。
 */

import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// ─── 初始化独立测试数据库 ────────────────────────────────────────────────────

const TEST_DB = path.resolve(__dirname, '../prisma/test_sort.db')
process.env.DATABASE_URL = `file:${TEST_DB}`

// 创建 Schema（db push）
execSync('npx prisma db push --skip-generate', {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env },
  stdio: 'ignore',
})

const prisma = new PrismaClient()

// ─── 颜色工具 ───────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const CYAN   = '\x1b[36m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${msg}`)
    passed++
  } else {
    console.log(`  ${RED}✗${RESET} ${msg}`)
    if (detail) console.log(`    ${RED}${detail}${RESET}`)
    failed++
  }
}

// ─── 测试数据设计（5 条，各字段顺序不同，便于区分） ─────────────────────────
//
//  id | title    | heatScore | createdAt   | publishedAt  | sourceCount
//  A  | SORT-A   |  9.0      |  now-1h     |  now-5h      |  2
//  B  | SORT-B   |  7.0      |  now-2h     |  now-1h      |  5
//  C  | SORT-C   |  5.0      |  now-3h     |  now-3h      |  1
//  D  | SORT-D   |  3.0      |  now-4h     |  now-2h      |  4
//  E  | SORT-E   |  1.0      |  now-5h     |  now-4h      |  3
//
//  期望排序：
//   sort=heat      → A(9) > B(7) > C(5) > D(3) > E(1)   热度降序
//   sort=time      → A(1h) > B(2h) > C(3h) > D(4h) > E(5h)  createdAt降序
//   sort=published → B(pub1h) > D(pub2h) > C(pub3h) > E(pub4h) > A(pub5h)  publishedAt降序
//   sort=sources   → B(5src) > D(4src) > E(3src) > A(2src) > C(1src)  sourceCount降序

async function seedTestData() {
  const now = Date.now()
  const h = 3600_000

  const records = [
    { title: 'SORT-A', heatScore: 9.0, createdAt: new Date(now - 1 * h), publishedAt: new Date(now - 5 * h), sourceCount: 2, url: 'http://test/a', source: 'hackernews', domain: 'test', summary: '' },
    { title: 'SORT-B', heatScore: 7.0, createdAt: new Date(now - 2 * h), publishedAt: new Date(now - 1 * h), sourceCount: 5, url: 'http://test/b', source: 'hackernews', domain: 'test', summary: '' },
    { title: 'SORT-C', heatScore: 5.0, createdAt: new Date(now - 3 * h), publishedAt: new Date(now - 3 * h), sourceCount: 1, url: 'http://test/c', source: 'hackernews', domain: 'test', summary: '' },
    { title: 'SORT-D', heatScore: 3.0, createdAt: new Date(now - 4 * h), publishedAt: new Date(now - 2 * h), sourceCount: 4, url: 'http://test/d', source: 'hackernews', domain: 'test', summary: '' },
    { title: 'SORT-E', heatScore: 1.0, createdAt: new Date(now - 5 * h), publishedAt: new Date(now - 4 * h), sourceCount: 3, url: 'http://test/e', source: 'hackernews', domain: 'test', summary: '' },
  ]
  await prisma.hotSpot.createMany({ data: records })
}

// ─── 核心：复用与路由相同的 orderBy 逻辑 ────────────────────────────────────

function buildOrderBy(sort: string) {
  if (sort === 'heat')      return [{ heatScore: 'desc' as const }, { createdAt: 'desc' as const }]
  if (sort === 'time')      return [{ createdAt: 'desc' as const }]
  if (sort === 'published') return [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }]
  if (sort === 'sources')   return [{ sourceCount: 'desc' as const }, { heatScore: 'desc' as const }]
  return [{ heatScore: 'desc' as const }, { createdAt: 'desc' as const }]
}

async function runSortTest(sort: string, expectedOrder: string[], desc: string) {
  const results = await prisma.hotSpot.findMany({
    orderBy: buildOrderBy(sort),
    select: { title: true, heatScore: true, publishedAt: true, sourceCount: true, createdAt: true },
  })
  const actual = results.map(r => r.title)
  const ok = actual.join(',') === expectedOrder.join(',')
  assert(ok, `sort=${sort}: ${desc}`,
    ok ? undefined : `期望: [${expectedOrder.join(', ')}]\n    实际: [${actual.join(', ')}]`
  )

  // 二次验证：检查相邻元素的排序字段确实是降序
  if (sort === 'heat') {
    let monotone = true
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].heatScore < results[i + 1].heatScore) { monotone = false; break }
    }
    assert(monotone, `sort=heat 单调验证：heatScore 逐项降序`)
  }
  if (sort === 'time') {
    let monotone = true
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].createdAt < results[i + 1].createdAt) { monotone = false; break }
    }
    assert(monotone, `sort=time 单调验证：createdAt 逐项降序`)
  }
  if (sort === 'published') {
    let monotone = true
    for (let i = 0; i < results.length - 1; i++) {
      const a = results[i].publishedAt?.getTime() ?? 0
      const b = results[i + 1].publishedAt?.getTime() ?? 0
      if (a < b) { monotone = false; break }
    }
    assert(monotone, `sort=published 单调验证：publishedAt 逐项降序`)
  }
  if (sort === 'sources') {
    let monotone = true
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i].sourceCount < results[i + 1].sourceCount) { monotone = false; break }
    }
    assert(monotone, `sort=sources 单调验证：sourceCount 逐项降序`)
  }
}

// ─── heatLevel 筛选测试 ──────────────────────────────────────────────────────

async function runFilterTest() {
  // high: heatScore >= 8 → 只有 SORT-A(9)
  const high = await prisma.hotSpot.findMany({ where: { heatScore: { gte: 8 } }, select: { title: true } })
  assert(high.length === 1 && high[0].title === 'SORT-A', 'heatLevel=high 筛选 (≥8): 仅返回 SORT-A',
    high.length !== 1 ? `返回 ${high.length} 条: ${high.map(h => h.title).join(', ')}` : undefined)

  // medium: 5 <= heatScore < 8 → SORT-B(7), SORT-C(5)
  const medium = await prisma.hotSpot.findMany({ where: { heatScore: { gte: 5, lt: 8 } }, select: { title: true } })
  assert(medium.length === 2, 'heatLevel=medium 筛选 (5-8): 返回 2 条',
    `返回 ${medium.length} 条: ${medium.map(h => h.title).join(', ')}`)

  // low: heatScore < 5 → SORT-D(3), SORT-E(1)
  const low = await prisma.hotSpot.findMany({ where: { heatScore: { lt: 5 } }, select: { title: true } })
  assert(low.length === 2, 'heatLevel=low 筛选 (<5): 返回 2 条',
    `返回 ${low.length} 条: ${low.map(h => h.title).join(', ')}`)
}

// ─── 来源筛选测试 ────────────────────────────────────────────────────────────

async function runSourceTest() {
  // 插入一条不同来源的记录
  const now = Date.now()
  await prisma.hotSpot.create({
    data: {
      title: 'SORT-GITHUB', heatScore: 6.0, sourceCount: 2,
      createdAt: new Date(now - 30 * 60 * 1000),
      url: 'http://test/github', source: 'github', domain: 'test', summary: '',
    },
  })

  const hn = await prisma.hotSpot.findMany({ where: { source: 'hackernews' }, select: { title: true } })
  assert(hn.length === 5, 'source=hackernews 筛选: 返回 5 条', `返回 ${hn.length} 条`)

  const gh = await prisma.hotSpot.findMany({ where: { source: 'github' }, select: { title: true } })
  assert(gh.length === 1 && gh[0].title === 'SORT-GITHUB', 'source=github 筛选: 返回 1 条', `返回 ${gh.length} 条`)
}

// ─── 时间范围测试 ────────────────────────────────────────────────────────────

async function runTimeRangeTest() {
  // 6h 内 → createdAt >= now-6h → 全部5条都在6h内（A:1h B:2h C:3h D:4h E:5h）
  const since6h = new Date(Date.now() - 6 * 3600_000)
  const in6h = await prisma.hotSpot.findMany({
    where: { createdAt: { gte: since6h }, source: 'hackernews' },
    select: { title: true },
  })
  assert(in6h.length === 5, 'timeRange=6h 内：hackernews 5 条全部在 6h 内', `返回 ${in6h.length} 条`)

  // 2h 内 → createdAt >= now-2h → 只有 A(1h), B(2h)  ± 边界允许一条
  const since2h = new Date(Date.now() - 2 * 3600_000)
  const in2h = await prisma.hotSpot.findMany({
    where: { createdAt: { gte: since2h }, source: 'hackernews' },
    select: { title: true },
  })
  assert(in2h.length >= 1 && in2h.length <= 3, `timeRange=2h 内：1~3 条（实际 ${in2h.length} 条）`)
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════${RESET}`)
  console.log(`${BOLD}${CYAN}  HotMonitor 排序规则集成测试${RESET}`)
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════${RESET}\n`)

  try {
    await seedTestData()
    console.log(`${DIM}[✓ 已插入 5 条测试数据]\n${RESET}`)

    console.log(`${BOLD}【排序规则】${RESET}`)
    await runSortTest('heat',      ['SORT-A','SORT-B','SORT-C','SORT-D','SORT-E'], 'heatScore 降序')
    await runSortTest('time',      ['SORT-A','SORT-B','SORT-C','SORT-D','SORT-E'], 'createdAt 降序')
    await runSortTest('published', ['SORT-B','SORT-D','SORT-C','SORT-E','SORT-A'], 'publishedAt 降序')
    await runSortTest('sources',   ['SORT-B','SORT-D','SORT-E','SORT-A','SORT-C'], 'sourceCount 降序')

    console.log(`\n${BOLD}【热度筛选】${RESET}`)
    await runFilterTest()

    console.log(`\n${BOLD}【来源筛选】${RESET}`)
    await runSourceTest()

    console.log(`\n${BOLD}【时间范围筛选】${RESET}`)
    await runTimeRangeTest()

  } finally {
    await prisma.$disconnect()
    // 删除测试数据库
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
    const walFile = TEST_DB + '-wal'
    const shmFile = TEST_DB + '-shm'
    if (existsSync(walFile)) unlinkSync(walFile)
    if (existsSync(shmFile)) unlinkSync(shmFile)
    console.log(`\n${DIM}[✓ 测试数据库已清理]\n${RESET}`)
  }

  // ─── 汇总 ─────────────────────────────────────────────────────────────────

  const total = passed + failed
  console.log(`${'─'.repeat(39)}`)
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}  ✓ 全部通过  ${passed}/${total} 项${RESET}\n`)
    process.exit(0)
  } else {
    console.log(`${RED}${BOLD}  ✗ 失败 ${failed} 项 / 通过 ${passed} 项 (共 ${total})${RESET}\n`)
    process.exit(1)
  }
}

main().catch(e => {
  console.error(RED + '致命错误：' + RESET, e)
  process.exit(1)
})
