/**
 * 离线评估：本地命中 +（可选）完整 AI verify。
 * 用法（在 server 目录）：
 *   npx tsx src/eval-verify.ts           # 仅本地用例，不调用 API
 *   npx tsx src/eval-verify.ts --ai      # 需配置 EASYROUTER 或 OPENROUTER，会消耗 token
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import { localRelevanceMatch } from './lib/keyword-match'
import { verifyContent } from './lib/openrouter'

interface Fixture {
  id: string
  keyword: string
  title: string
  content: string
  queryExpansion?: string | null
  expectLocalPass: boolean
  /** 仅 --ai 时检查 */
  expectMaxRelevance?: number
  expectEntityNotPrimary?: boolean
}

function loadFixtures(): Fixture[] {
  const p = join(__dirname, 'eval', 'verify-fixtures.json')
  const raw = readFileSync(p, 'utf-8')
  const arr = JSON.parse(raw) as Fixture[]
  if (!Array.isArray(arr)) throw new Error('fixtures must be array')
  return arr
}

async function main() {
  const withAi = process.argv.includes('--ai')
  const fixtures = loadFixtures()
  let failed = 0

  for (const f of fixtures) {
    const local = localRelevanceMatch(f.keyword, f.title, f.content, f.queryExpansion ?? null)
    const okLocal = local === f.expectLocalPass
    if (!okLocal) {
      console.error(`[FAIL local] ${f.id}: got ${local}, expect ${f.expectLocalPass}`)
      failed++
      continue
    }
    console.log(`[OK local] ${f.id}`)

    if (withAi) {
      try {
        const r = await verifyContent(f.keyword, f.title, f.content, {
          queryExpansionJson: f.queryExpansion ?? null,
        })
        if (f.expectMaxRelevance !== undefined && r.relevance > f.expectMaxRelevance + 1e-6) {
          console.error(
            `[FAIL ai] ${f.id}: relevance ${r.relevance} > max ${f.expectMaxRelevance} entity=${r.entityMatch}`
          )
          failed++
        } else if (f.expectEntityNotPrimary && r.entityMatch === 'primary') {
          console.error(`[FAIL ai] ${f.id}: expected non-primary, got primary rel=${r.relevance}`)
          failed++
        } else {
          console.log(`[OK ai] ${f.id} rel=${r.relevance.toFixed(2)} entity=${r.entityMatch}`)
        }
      } catch (e) {
        console.error(`[FAIL ai] ${f.id}:`, e)
        failed++
      }
    }
  }

  console.log(withAi ? `\nDone (with AI). Failed: ${failed}/${fixtures.length}` : `\nDone (local only). Failed: ${failed}/${fixtures.length}`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
