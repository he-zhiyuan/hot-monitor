/** 环境变量 MONITOR_MIN_RELEVANCE（0–1）与单条监控 minRelevance 的合成默认值 */
export function defaultMinRelevanceFromEnv(): number {
  const v = parseFloat(process.env.MONITOR_MIN_RELEVANCE || '0.65')
  if (!Number.isFinite(v)) return 0.65
  return Math.min(0.95, Math.max(0.35, v))
}

export function clampMinRelevance(n: unknown): number | undefined {
  if (n === undefined || n === null || n === '') return undefined
  const v = typeof n === 'number' ? n : parseFloat(String(n))
  if (!Number.isFinite(v)) return undefined
  return Math.min(0.95, Math.max(0.35, v))
}
