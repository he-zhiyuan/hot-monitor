/**
 * AI 接入层：优先使用 EasyRouter，降级到 OpenRouter
 * EasyRouter 文档：https://docs.easyrouter.io
 * OpenRouter 文档：https://openrouter.ai/docs/quickstart
 */
import OpenAI from 'openai'

// EasyRouter 客户端（OpenAI 兼容格式，稳定可用）
const easyRouterClient = process.env.EASYROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.EASYROUTER_API_KEY,
      baseURL: 'https://easyrouter.io/v1',
    })
  : null

// OpenRouter 客户端（备用）
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
  // 1. EasyRouter 优先（稳定、兼容 OpenAI 格式，无 TLS 限制）
  if (easyRouterClient) {
    const models = process.env.EASYROUTER_MODEL
      ? [process.env.EASYROUTER_MODEL]
      : ['MiniMax-M2.5']

    for (const model of models) {
      const result = await tryClient(easyRouterClient, model, messages, 'EasyRouter')
      if (result) return result
    }
  }

  // 2. OpenRouter 降级
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

export interface AIVerifyResult {
  isReal: boolean
  relevance: number
  summary: string
  reason: string
}

export interface AIHeatResult {
  id: string
  score: number
  summary: string
}

/** 本地关键词预匹配，减少不必要的 AI 调用 */
function localRelevanceCheck(keyword: string, title: string, content: string): boolean {
  const kws = keyword.toLowerCase().split(/\s+/)
  const text = (title + ' ' + content).toLowerCase()
  return kws.some(kw => text.includes(kw))
}

/** 验证内容是否为真实热点 */
export async function verifyContent(
  keyword: string,
  title: string,
  content: string
): Promise<AIVerifyResult> {
  if (!easyRouterClient && !openrouterClient) {
    return { isReal: false, relevance: 0.5, summary: title.slice(0, 30), reason: '未配置 AI Key' }
  }

  if (!localRelevanceCheck(keyword, title, content)) {
    return { isReal: false, relevance: 0.1, summary: '', reason: '内容与关键词不相关' }
  }

  try {
    const text = await chatWithFallback([
      {
        role: 'system',
        content: '你是新闻真实性分析器。只返回JSON，不要代码块或任何额外文字。',
      },
      {
        role: 'user',
        content: `关键词：${keyword}
标题：${title}
内容：${content.slice(0, 600)}

判断：1.是否真实新闻(非营销/转载/猜测) 2.相关度0-1 3.一句话摘要(中文20字内) 4.理由

返回：{"isReal":true,"relevance":0.8,"summary":"...","reason":"..."}`,
      },
    ])

    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    return JSON.parse(match[0]) as AIVerifyResult
  } catch (err) {
    console.error('[AI] verifyContent error:', (err as any)?.message || err)
    return { isReal: false, relevance: 0, summary: '', reason: 'AI 分析失败' }
  }
}

/** 批量为热点内容打热度分 */
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
