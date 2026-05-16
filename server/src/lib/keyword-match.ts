/**
 * 本地命中：结合 query expansion 短语，减少「只命中泛词」的假阳性。
 */

export interface KeywordQueryExpansion {
  /** 从具体到一般；首项建议为规范化的用户原词 */
  phrases: string[]
  /** 给 verify 模型的一句提示（中文） */
  modelNotes?: string
}

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[·•]/g, ' ')
    .trim()
}

const BODY = (title: string, content: string) => normalizeForMatch(`${title} ${content}`)

function parseExpansionJson(raw: string | null | undefined): KeywordQueryExpansion | null {
  if (!raw?.trim()) return null
  try {
    const o = JSON.parse(raw) as KeywordQueryExpansion
    if (!o || !Array.isArray(o.phrases) || o.phrases.length === 0) return null
    const phrases = [...new Set(o.phrases.map(p => normalizeForMatch(String(p))).filter(Boolean))]
    return { phrases, modelNotes: o.modelNotes ? String(o.modelNotes).slice(0, 500) : undefined }
  } catch {
    return null
  }
}

/** 无 AI 时的保守扩展：仅规范化原词 */
export function fallbackExpansion(keyword: string): KeywordQueryExpansion {
  const k = normalizeForMatch(keyword.trim())
  return { phrases: k ? [k] : [], modelNotes: '' }
}

/**
 * 显著 token：用于多词关键词时的「至少命中多个」回退逻辑
 */
function significantTokens(keyword: string): string[] {
  return normalizeForMatch(keyword)
    .split(/\s+/)
    .map(t => t.replace(/[^\w\u4e00-\u9fff.+-]/gi, ''))
    .filter(t => t.length >= 2 && !/^[\d.+-]+$/.test(t))
}

/**
 * 是否通过本地门槛（通过才调用 AI）
 */
export function localRelevanceMatch(
  keyword: string,
  title: string,
  content: string,
  expansionJson?: string | null
): boolean {
  const text = BODY(title, content)
  const kw = normalizeForMatch(keyword.trim())
  if (!kw || !text) return false

  const exp = parseExpansionJson(expansionJson) ?? fallbackExpansion(keyword)
  const phrases = exp.phrases.length ? exp.phrases : fallbackExpansion(keyword).phrases
  const sorted = [...phrases].sort((a, b) => b.length - a.length)

  const minPhraseLen = Math.max(4, Math.min(16, Math.ceil(kw.length * 0.45)))

  for (const p of sorted) {
    if (!p || p.length < 2) continue
    if (!text.includes(p)) continue
    // 单极短词（如单独 "ai"）不作为充分命中
    if (p.length < 3 && !/\d/.test(p)) continue
    // 多词关键词：过短的扩展命中要求更严
    if (kw.split(/\s+/).length >= 2 && p.length < minPhraseLen && p !== kw) continue
    return true
  }

  // 回退：整词原句子串
  if (text.includes(kw)) return true

  // 回退：多 token 需命中多数显著 token（避免任一泛词）
  const tokens = significantTokens(keyword)
  if (tokens.length === 0) return false
  if (tokens.length === 1) return text.includes(tokens[0])
  const hits = tokens.filter(t => text.includes(t))
  const need = Math.max(2, Math.ceil(tokens.length * 0.51))
  return hits.length >= need
}
