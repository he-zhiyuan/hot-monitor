/**
 * OpenRouter AI 接入层
 * 使用 openai SDK 兼容模式（OpenRouter 官方文档认可的用法）
 * https://openrouter.ai/docs/quickstart#using-the-openai-sdk
 */
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'placeholder',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3001',
    'X-OpenRouter-Title': 'HotMonitor', // 正确的 Header 名（文档要求）
  },
})

// 模型降级链
const MODEL_FALLBACKS: string[] = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
      'baidu/cobuddy:free',
      'google/gemma-4-31b-it:free',
      'google/gemini-2.5-flash', // 付费，余额充足时更稳定
    ]

async function chatWithFallback(
  messages: OpenAI.ChatCompletionMessageParam[]
): Promise<string> {
  for (const model of MODEL_FALLBACKS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          max_tokens: 512,
        })
        const content = res.choices[0]?.message?.content || ''
        if (content) {
          console.log(`[OpenRouter] OK with model: ${model}`)
          return content
        }
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode
        if (status === 401 || status === 403) {
          console.warn(`[OpenRouter] model ${model} auth error (${status}), skipping`)
          break
        }
        if (status === 429) {
          console.warn(`[OpenRouter] model ${model} rate limited, waiting 15s...`)
          await new Promise(r => setTimeout(r, 15000))
          continue
        }
        console.warn(`[OpenRouter] model ${model} failed (${status}), trying next...`)
        break
      }
    }
  }
  throw new Error('All models failed')
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
  if (!process.env.OPENROUTER_API_KEY) {
    return { isReal: false, relevance: 0.5, summary: title.slice(0, 30), reason: '未配置 API Key' }
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
    console.error('[OpenRouter] verifyContent error:', (err as any)?.message || err)
    return { isReal: false, relevance: 0, summary: '', reason: 'AI 分析失败' }
  }
}

/** 批量为热点内容打热度分 */
export async function scoreHotspots(
  items: Array<{ id: string; title: string; content: string }>
): Promise<AIHeatResult[]> {
  if (items.length === 0) return []
  if (!process.env.OPENROUTER_API_KEY) {
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
      console.error('[OpenRouter] scoreHotspots error:', (err as any)?.message)
      results.push(...batch.map(b => ({ id: b.id, score: 5, summary: b.title.slice(0, 15) })))
    }

    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  return results
}
