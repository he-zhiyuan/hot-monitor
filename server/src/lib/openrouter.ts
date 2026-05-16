/**
 * AI 接入层：优先使用 EasyRouter，降级到 OpenRouter
 * EasyRouter 文档：https://docs.easyrouter.io
 * OpenRouter 文档：https://openrouter.ai/docs/quickstart
 */
import OpenAI from 'openai'
import type { KeywordQueryExpansion } from './keyword-match'
import { fallbackExpansion, localRelevanceMatch, normalizeForMatch } from './keyword-match'

const easyRouterClient = process.env.EASYROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.EASYROUTER_API_KEY,
      baseURL: 'https://easyrouter.io/v1',
    })
  : null

const openrouterClient = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'HotMonitor',
      },
    })
  : null

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

async function tryClient(
  client: OpenAI,
  model: string,
  messages: Message[],
  label: string
): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model, messages, temperature: 0.1, max_tokens: 512,
      })
      const content = res.choices[0]?.message?.content || ''
      if (content) {
        console.log(`[AI] OK via ${label}/${model}`)
        return content
      }
    } catch (err: any) {
      const status = err?.status
      if (status === 429) {
        console.warn(`[AI] ${label}/${model} rate limited, waiting 10s...`)
        await new Promise(r => setTimeout(r, 10000))
        continue
      }
      console.warn(`[AI] ${label}/${model} failed (${status})`)
      break
    }
  }
  return null
}

async function chatWithFallback(messages: Message[]): Promise<string> {
  if (easyRouterClient) {
    const models = process.env.EASYROUTER_MODEL
      ? [process.env.EASYROUTER_MODEL]
      : ['MiniMax-M2.5']

    for (const model of models) {
      const result = await tryClient(easyRouterClient, model, messages, 'EasyRouter')
      if (result) return result
    }
  }

  if (openrouterClient) {
    const models = process.env.OPENROUTER_MODEL
      ? [process.env.OPENROUTER_MODEL]
      : ['google/gemma-4-31b-it:free', 'google/gemini-2.5-flash']

    for (const model of models) {
      const result = await tryClient(openrouterClient, model, messages, 'OpenRouter')
      if (result) return result
    }
  }

  throw new Error('All AI models failed — please configure EASYROUTER_API_KEY in .env')
}

export type EntityMatchLevel = 'primary' | 'related_product' | 'tangential' | 'unrelated'

export interface AIVerifyResult {
  isReal: boolean
  relevance: number
  /** 与关键词强相关的 20 字内要点，首句应点明与监控对象的关系 */
  summary: string
  /** 判定理由（为何该相关度、是否同一监控主体） */
  reason: string
  entityMatch: EntityMatchLevel
  /** 从标题/正文中摘录的短证据（<=80字），须为原文子串 */
  evidence: string
}

export interface AIHeatResult {
  id: string
  score: number
  summary: string
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

function evidenceInBody(evidence: string, title: string, content: string): boolean {
  const e = normalizeForMatch(evidence).slice(0, 200)
  if (e.length < 4) return false
  const body = normalizeForMatch(`${title} ${content}`)
  return body.includes(e)
}

function postAdjustRelevance(
  raw: AIVerifyResult,
  title: string,
  content: string
): AIVerifyResult {
  let { relevance, entityMatch, evidence } = raw
  relevance = clamp01(relevance)

  const caps: Record<EntityMatchLevel, number> = {
    primary: 1,
    related_product: 0.72,
    tangential: 0.52,
    unrelated: 0.28,
  }
  relevance = Math.min(relevance, caps[entityMatch] ?? relevance)

  if (evidence && !evidenceInBody(evidence, title, content)) {
    relevance = Math.min(relevance, 0.45)
  }

  return { ...raw, relevance: clamp01(relevance) }
}

/**
 * Query expansion：为监控词生成「命中短语」与模型提示，收紧本地预筛并辅助相关性判定。
 */
export async function expandMonitorKeyword(keyword: string): Promise<KeywordQueryExpansion> {
  const trimmed = keyword.trim()
  if (!trimmed) return fallbackExpansion(keyword)
  if (trimmed.startsWith('@')) {
    return { phrases: [normalizeForMatch(trimmed)], modelNotes: '账号模式：以该账号发布为准。' }
  }

  if (!easyRouterClient && !openrouterClient) {
    return fallbackExpansion(trimmed)
  }

  try {
    const text = await chatWithFallback([
      {
        role: 'system',
        content:
          '你是搜索查询扩展（query expansion）助手，只返回 JSON，不要代码块或额外文字。',
      },
      {
        role: 'user',
        content: `用户要在科技资讯里监控以下「监控词」，请生成用于文本命中的短语列表。

监控词：${trimmed}

要求：
1. phrases：6～10 条字符串，从**最具体**到较具体排列；第 1 条必须是监控词本身的标准形态（小写、多空格合一）。
2. 加入常见变体：大小写/空格/中英文别名/型号写法（如 4.6 与 4.6.0 若合理）。
3. **禁止**把过于宽泛的单独词作为唯一短条目（例如监控词含「Sonnet 4.6」时，不要只输出单独「claude」一条作为命中条件）；宽泛词必须与型号/产品线组合（如 "claude sonnet 4.6"）。
4. modelNotes：一句中文，说明「什么才是 primary 命中」，便于后续模型判断相关性。

返回：{"phrases":["..."],"modelNotes":"..."}`,
      },
    ])

    const obj = extractJsonObject(text)
    if (!obj || !Array.isArray(obj.phrases)) return fallbackExpansion(trimmed)

    const phrases = [...new Set(
      (obj.phrases as unknown[])
        .map(p => normalizeForMatch(String(p)))
        .filter(p => p.length >= 2)
    )].slice(0, 12)

    if (phrases.length === 0) return fallbackExpansion(trimmed)

    const first = normalizeForMatch(trimmed)
    if (!phrases.some(p => p === first || p.includes(first) || first.includes(p))) {
      phrases.unshift(first)
    }

    const modelNotes = typeof obj.modelNotes === 'string' ? obj.modelNotes.slice(0, 500) : undefined
    return { phrases, modelNotes }
  } catch (err) {
    console.error('[AI] expandMonitorKeyword:', (err as Error)?.message || err)
    return fallbackExpansion(trimmed)
  }
}

export async function verifyContent(
  keyword: string,
  title: string,
  content: string,
  options?: { queryExpansionJson?: string | null }
): Promise<AIVerifyResult> {
  const expansionJson = options?.queryExpansionJson

  if (!easyRouterClient && !openrouterClient) {
    return {
      isReal: false,
      relevance: 0.5,
      summary: title.slice(0, 30),
      reason: '未配置 AI Key',
      entityMatch: 'tangential',
      evidence: '',
    }
  }

  if (!localRelevanceMatch(keyword, title, content, expansionJson)) {
    return {
      isReal: false,
      relevance: 0.08,
      summary: '',
      reason: '本地预筛：正文未命中扩展短语或多数关键词 token',
      entityMatch: 'unrelated',
      evidence: '',
    }
  }

  let expansionHint = ''
  try {
    if (expansionJson) {
      const o = JSON.parse(expansionJson) as KeywordQueryExpansion
      if (o?.modelNotes) expansionHint = `\n扩展提示：${o.modelNotes}`
      if (o?.phrases?.length) {
        expansionHint += `\n扩展短语（用于理解监控对象，不等同于必须逐字出现）：${o.phrases.slice(0, 8).join(' | ')}`
      }
    }
  } catch { /* ignore */ }

  const slice = content.slice(0, 900)

  try {
    const text = await chatWithFallback([
      {
        role: 'system',
        content:
          '你是科技资讯相关性审核器。只返回 JSON，不要代码块或任何额外文字。字段必须齐全。',
      },
      {
        role: 'user',
        content: `监控词：${keyword}${expansionHint}
标题：${title}
正文节选：${slice}

任务：
1) isReal：是否为真实发布/新闻/更新（排除纯营销、空壳转载、无根据猜测）。
2) entityMatch：正文与「监控词所指对象」的关系
   - primary：核心就是在讨论该对象（或该版本/该产品线）。
   - related_product：同一品牌或生态但**不是**用户要监控的那个对象（如只要 Sonnet4.6 却主要在讲 OpenClaw/别的工具）。
   - tangential：同属 AI 大话题但主体明显不是监控对象。
   - unrelated：与监控对象无关。
3) relevance：0～1 小数；须与 entityMatch 一致（unrelated 应 <=0.25；tangential <=0.45；related_product <=0.65；primary 才可能 >0.75）。
4) evidence：从标题或正文中**原样摘录**一小段（<=80字）作为证据；必须与监控对象直接相关，否则 entityMatch 不能为 primary。
5) summary：中文，<=22字；**必须以「与监控词的关系」开头**（如「Sonnet4.6 发布…」「与监控词无关：…」）。
6) reason：中文一句，解释相关度与 entityMatch（<=60字）。

返回 JSON：
{"isReal":true,"relevance":0.82,"entityMatch":"primary","evidence":"...","summary":"...","reason":"..."}`,
      },
    ])

    const obj = extractJsonObject(text)
    if (!obj) throw new Error('No JSON object in response')

    const entityRaw = String(obj.entityMatch || 'tangential').toLowerCase().replace(/-/g, '_')
    const entityMap: Record<string, EntityMatchLevel> = {
      primary: 'primary',
      related_product: 'related_product',
      related: 'related_product',
      tangential: 'tangential',
      unrelated: 'unrelated',
    }
    const entityMatch = entityMap[entityRaw] ?? 'tangential'

    const raw: AIVerifyResult = {
      isReal: Boolean(obj.isReal),
      relevance: clamp01(Number(obj.relevance)),
      summary: String(obj.summary || '').slice(0, 80),
      reason: String(obj.reason || '').slice(0, 120),
      entityMatch,
      evidence: String(obj.evidence || '').slice(0, 120),
    }

    return postAdjustRelevance(raw, title, content)
  } catch (err) {
    console.error('[AI] verifyContent error:', (err as any)?.message || err)
    return {
      isReal: false,
      relevance: 0,
      summary: '',
      reason: 'AI 分析失败',
      entityMatch: 'unrelated',
      evidence: '',
    }
  }
}

export async function scoreHotspots(
  items: Array<{ id: string; title: string; content: string }>
): Promise<AIHeatResult[]> {
  if (items.length === 0) return []
  if (!easyRouterClient && !openrouterClient) {
    return items.map(i => ({ id: i.id, score: 5, summary: i.title.slice(0, 15) }))
  }

  const batchSize = 5
  const results: AIHeatResult[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    try {
      const text = await chatWithFallback([
        {
          role: 'system',
          content: '你是AI/编程领域热点分析器。只返回JSON数组，不要代码块或额外文字。',
        },
        {
          role: 'user',
          content: `以下内容打热度分(0-10)，同时写一句话中文摘要(15字内)。
评分：9-10重大模型发布，7-8功能更新，5-6行业动态，3-4一般，0-2无价值

内容：${JSON.stringify(batch.map(b => ({ id: b.id, title: b.title, text: b.content.slice(0, 100) })))}

返回：[{"id":"0","score":8.5,"summary":"Claude发布新版本"}]`,
        },
      ])

      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) results.push(...(JSON.parse(match[0]) as AIHeatResult[]))
    } catch (err) {
      console.error('[AI] scoreHotspots error:', (err as any)?.message)
      results.push(...batch.map(b => ({ id: b.id, score: 5, summary: b.title.slice(0, 15) })))
    }

    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}

export { localRelevanceMatch, fallbackExpansion }
export type { KeywordQueryExpansion } from './keyword-match'
