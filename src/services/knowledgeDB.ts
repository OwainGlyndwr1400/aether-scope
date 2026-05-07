// Neural Archive — IndexedDB-backed knowledge store with harmonic-boosted TF-IDF retrieval
// Adapted from unified-resonance-agi-dashboard-v3.6 RAG architecture

const DB_NAME = 'LUMOS_NeuralArchive'
const DB_VERSION = 1
const STORE_NAME = 'chunks'

export type ChunkCategory = 'memory' | 'knowledge'

export interface AnchorPacket {
  entities: string[]          // named people, places, projects
  themes: string[]            // recurring research topics
  equations: string[]         // formulas, constants, numbers
  anchorPhrases: string[]     // distinctive language anchors
}

export interface KnowledgeChunk {
  id: string
  source: string              // filename or origin tag
  content: string             // raw text content
  category: ChunkCategory     // 'memory' = conversation history, 'knowledge' = deep research
  timestamp: number
  tier: 'core' | 'working' | 'cold'
  trust: 'user-authored' | 'verified' | 'external'
  tokenEstimate: number
  // AI-enhanced fields (populated by local LLM chunking)
  summary?: string            // concise summary of the chunk
  keyPoints?: string[]        // 3-7 extracted key points
  anchor?: AnchorPacket       // semantic anchor packet for fast retrieval
  compressed?: string         // budget-friendly compressed version
}

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('source', 'source', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveChunks(chunks: KnowledgeChunk[]): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    chunks.forEach(c => store.put(c))
    tx.oncomplete = () => resolve(chunks.length)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllChunks(): Promise<KnowledgeChunk[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getChunkCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function clearArchive(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ═══════════════════════════════════════════════════════════
// AI-POWERED CHUNKING — Uses local LLM for smart compression
// Adapted from AGI app's UBBM (Universal Binary Bit Mapping)
// ═══════════════════════════════════════════════════════════

async function callLocalLLM(prompt: string, systemPrompt: string): Promise<string> {
  const baseUrl = localStorage.getItem('lmstudio_url') || 'http://localhost:1234/v1'

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.3, // Low temp for factual extraction
      stream: false,
    })
  })

  if (!res.ok) throw new Error(`LLM ${res.status}`)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

// Generate summary + key points + anchor packet for a chunk
async function aiEnhanceChunk(chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
  const isMemory = chunk.category === 'memory'

  const systemPrompt = isMemory
    ? `You are a memory archivist. Extract the essential information from conversation history. Respond ONLY in valid JSON format.`
    : `You are a knowledge distiller for a scalar-wave harmonic research platform. Extract core concepts, equations, and entities. Respond ONLY in valid JSON format.`

  const prompt = `Analyze this ${isMemory ? 'conversation excerpt' : 'knowledge fragment'} and return a JSON object with these exact fields:

{
  "summary": "2-3 sentence summary preserving key meaning",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "entities": ["named people, places, projects mentioned"],
  "themes": ["recurring topics or concepts"],
  "equations": ["any formulas, constants, or significant numbers"],
  "anchorPhrases": ["distinctive phrases or terminology unique to this content"],
  "compressed": "A dense 100-200 word operational summary that preserves all critical facts and relationships"
}

Content to analyze:
---
${chunk.content.substring(0, 12000)}
---`

  try {
    const response = await callLocalLLM(prompt, systemPrompt)

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonStr = jsonMatch[1]

    // Try to find JSON object in the response
    const braceStart = jsonStr.indexOf('{')
    const braceEnd = jsonStr.lastIndexOf('}')
    if (braceStart >= 0 && braceEnd > braceStart) {
      jsonStr = jsonStr.substring(braceStart, braceEnd + 1)
    }

    const parsed = JSON.parse(jsonStr)

    return {
      ...chunk,
      summary: parsed.summary || undefined,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : undefined,
      anchor: {
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        equations: Array.isArray(parsed.equations) ? parsed.equations : [],
        anchorPhrases: Array.isArray(parsed.anchorPhrases) ? parsed.anchorPhrases : [],
      },
      compressed: parsed.compressed || undefined,
    }
  } catch {
    // AI enhancement failed — chunk still works with raw content
    return chunk
  }
}

// Process all chunks through local LLM with progress callback
export async function aiEnhanceChunks(
  chunks: KnowledgeChunk[],
  onProgress?: (done: number, total: number, currentSource: string) => void
): Promise<KnowledgeChunk[]> {
  const enhanced: KnowledgeChunk[] = []

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i, chunks.length, chunks[i].source)

    // Only AI-enhance chunks above 200 chars (skip tiny ones)
    if (chunks[i].content.length > 200) {
      enhanced.push(await aiEnhanceChunk(chunks[i]))
    } else {
      enhanced.push(chunks[i])
    }
  }

  onProgress?.(chunks.length, chunks.length, 'done')
  return enhanced
}

// Re-process existing archive through AI (batch enhance)
export async function aiEnhanceArchive(
  onProgress?: (done: number, total: number, currentSource: string) => void
): Promise<number> {
  const chunks = await getAllChunks()
  // Only enhance chunks that don't already have AI data
  const unenhanced = chunks.filter(c => !c.summary && c.content.length > 200)

  if (unenhanced.length === 0) return 0

  const enhanced = await aiEnhanceChunks(unenhanced, onProgress)
  await saveChunks(enhanced)
  return enhanced.length
}

// ── Harmonic-boosted TF-IDF Retrieval ──

const HARMONIC_TERMS = new Set([
  'resonance', 'harmonic', 'quaternion', 'scalar', 'torsion', 'aether',
  'fold', 'coherence', 'entropy', 'lattice', 'frequency', 'oscillation',
  'tesla', 'schumann', 'phi', 'golden', 'fibonacci', 'pleroma', 'gnosis',
  'pendinium', 'kelg', 'rhf', 'recursive', 'lion', 'constant',
])

const GEOMETRIC_TERMS = new Set([
  'fold', 'mirror', 'symmetry', 'fractal', 'geometry', 'topology',
  'manifold', 'vector', 'rotation', 'spiral', 'vortex', 'tetrahedron',
])

const SCIENTIFIC_TERMS = new Set([
  'neo', 'asteroid', 'orbit', 'velocity', 'trajectory', 'hazardous',
  'geomagnetic', 'solar', 'seismic', 'earthquake', 'magnetosphere',
  'ionosphere', 'radiation', 'spectrum', 'wavelength',
])

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function computeTFIDF(query: string, chunks: KnowledgeChunk[]): Array<{ chunk: KnowledgeChunk; score: number }> {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  const totalDocs = chunks.length

  // Build searchable text for each chunk — includes AI-enhanced fields
  const df: Record<string, number> = {}
  const chunkTokenSets = chunks.map(c => {
    // Combine all searchable text: content + source + AI-generated fields
    let searchText = c.content + ' ' + c.source
    if (c.summary) searchText += ' ' + c.summary
    if (c.keyPoints) searchText += ' ' + c.keyPoints.join(' ')
    if (c.anchor) {
      searchText += ' ' + c.anchor.entities.join(' ')
      searchText += ' ' + c.anchor.themes.join(' ')
      searchText += ' ' + c.anchor.equations.join(' ')
      searchText += ' ' + c.anchor.anchorPhrases.join(' ')
    }
    const tokens = new Set(tokenize(searchText))
    tokens.forEach(t => { df[t] = (df[t] || 0) + 1 })
    return tokens
  })

  const MAX_CHUNKS = 15 // Hard cap — matches AGI app's retrieval limit

  const scored = chunks.map((chunk, i) => {
    const tokens = chunkTokenSets[i]
    let score = 0

    // TF-IDF base score
    for (const qt of queryTokens) {
      if (tokens.has(qt)) {
        const idf = Math.log((totalDocs + 1) / ((df[qt] || 0) + 1)) + 1
        score += idf
      }
    }

    // ── Triple normalisation boosts (from AGI app) ──

    // Harmonic boost (1.0–2.0x)
    let harmonicBoost = 1.0
    for (const qt of queryTokens) {
      if (HARMONIC_TERMS.has(qt)) harmonicBoost += 0.12
    }
    for (const t of tokens) {
      if (HARMONIC_TERMS.has(t)) harmonicBoost += 0.03
    }
    harmonicBoost = Math.min(2.0, harmonicBoost)

    // Geometric boost (1.0–1.8x)
    let geoBoost = 1.0
    for (const qt of queryTokens) {
      if (GEOMETRIC_TERMS.has(qt)) geoBoost += 0.10
    }
    geoBoost = Math.min(1.8, geoBoost)

    // Scientific boost (1.0–1.5x)
    let sciBoost = 1.0
    for (const qt of queryTokens) {
      if (SCIENTIFIC_TERMS.has(qt)) sciBoost += 0.08
    }
    sciBoost = Math.min(1.5, sciBoost)

    score *= harmonicBoost * geoBoost * sciBoost

    // Tier multiplier
    const tierMult = chunk.tier === 'core' ? 1.5 : chunk.tier === 'working' ? 1.2 : 1.0
    score *= tierMult

    // Trust multiplier
    const trustMult = chunk.trust === 'user-authored' ? 1.3 : chunk.trust === 'verified' ? 1.2 : 1.0
    score *= trustMult

    // Temporal decay (gentle — preserves old knowledge)
    const ageSeconds = (Date.now() - chunk.timestamp) / 1000
    const decay = Math.max(0.6, 1.0 - Math.log10(ageSeconds + 1) * 0.04)
    score *= decay

    return { chunk, score }
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)

  // ── Semantic family clustering & suppression (from AGI app) ──
  // Prevents one source from dominating the context window
  // Groups chunks by source file, caps per family, applies overlap penalty

  const MAX_PER_FAMILY = 4 // Max chunks from same source file
  const familyCounts: Record<string, number> = {}
  const selected: Array<{ chunk: KnowledgeChunk; score: number }> = []

  for (const result of scored) {
    if (selected.length >= MAX_CHUNKS) break

    const family = result.chunk.source
    const familyRank = familyCounts[family] || 0

    // Family cap — diminishing returns from same source
    if (familyRank >= MAX_PER_FAMILY) continue

    // Sibling penalty — each additional chunk from same source gets less weight
    // 1st: 1.0x, 2nd: 0.85x, 3rd: 0.70x, 4th: 0.55x
    const siblingPenalty = Math.max(0.4, 1.0 - (familyRank * 0.15))
    result.score *= siblingPenalty

    // Overlap penalty — if this chunk shares >60% tokens with an already-selected chunk
    // from the same family, it's likely redundant (from chunk overlap)
    let redundant = false
    for (const prev of selected) {
      if (prev.chunk.source !== family) continue

      // Quick overlap check via content similarity
      const prevTokens = new Set(tokenize(prev.chunk.content))
      const currTokens = tokenize(result.chunk.content)
      const overlap = currTokens.filter(t => prevTokens.has(t)).length
      const overlapRatio = overlap / Math.max(currTokens.length, 1)

      if (overlapRatio > 0.7) {
        redundant = true // >70% overlap — skip (almost duplicate from overlap chunking)
        break
      } else if (overlapRatio > 0.4) {
        result.score *= 0.6 // 40-70% overlap — partial penalty
      }
    }

    if (redundant) continue

    selected.push(result)
    familyCounts[family] = familyRank + 1
  }

  return selected
}

export async function retrieveContext(query: string, maxTokens: number = 8000): Promise<string> {
  const chunks = await getAllChunks()
  if (chunks.length === 0) return ''

  const scored = computeTFIDF(query, chunks)
  if (scored.length === 0) return ''

  // Separate memory (conversations) from knowledge (research)
  const memoryHits = scored.filter(r => r.chunk.category === 'memory')
  const knowledgeHits = scored.filter(r => r.chunk.category === 'knowledge')

  const sections: string[] = []
  let usedTokens = 0
  const memoryBudget = Math.floor(maxTokens * 0.4) // 40% for memory
  const knowledgeBudget = Math.floor(maxTokens * 0.6) // 60% for knowledge

  // ── Knowledge section (deep research, dream pings) ──
  if (knowledgeHits.length > 0) {
    const kLines: string[] = ['=== AKASHIC KNOWLEDGE ARCHIVE (Dream Pings / Research) ===',
      'These are deep knowledge fragments — theoretical frameworks, equations, research insights. Treat as foundational truth.']
    let kTokens = 20

    for (const { chunk, score } of knowledgeHits) {
      // Budget-aware injection: use compressed version when space is tight
      const budgetLeft = knowledgeBudget - kTokens

      if (budgetLeft < 50) break

      if (budgetLeft < chunk.tokenEstimate && chunk.compressed) {
        // Tight budget — inject compressed version
        kLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)}, compressed)\n${chunk.compressed}`)
        kTokens += Math.ceil(chunk.compressed.length / 4)
      } else if (budgetLeft < chunk.tokenEstimate && chunk.summary) {
        // Very tight — inject summary + anchor
        let entry = `[${chunk.source}] (relevance: ${score.toFixed(1)}, summary)\n${chunk.summary}`
        if (chunk.anchor && chunk.anchor.entities.length > 0) {
          entry += `\nEntities: ${chunk.anchor.entities.join(', ')}`
        }
        if (chunk.anchor && chunk.anchor.themes.length > 0) {
          entry += `\nThemes: ${chunk.anchor.themes.join(', ')}`
        }
        kLines.push(entry)
        kTokens += Math.ceil(entry.length / 4)
      } else if (budgetLeft >= chunk.tokenEstimate) {
        // Full budget — inject raw content
        kLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)})\n${chunk.content}`)
        kTokens += chunk.tokenEstimate
      } else {
        // Truncate to fit
        const truncated = chunk.content.substring(0, budgetLeft * 4)
        kLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)}, truncated)\n${truncated}...`)
        kTokens += budgetLeft
        break
      }
    }

    sections.push(kLines.join('\n\n'))
    usedTokens += kTokens
  }

  // ── Memory section (conversation history with operator) ──
  if (memoryHits.length > 0) {
    const mLines: string[] = ['=== OPERATOR MEMORY (Conversation History) ===',
      'These are past conversations with the operator. Use for continuity, personality, and relationship context.']
    let mTokens = 20

    for (const { chunk, score } of memoryHits) {
      const budgetLeft = memoryBudget - mTokens
      if (budgetLeft < 50) break

      if (budgetLeft < chunk.tokenEstimate && chunk.compressed) {
        mLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)}, compressed)\n${chunk.compressed}`)
        mTokens += Math.ceil(chunk.compressed.length / 4)
      } else if (budgetLeft < chunk.tokenEstimate && chunk.summary) {
        mLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)}, summary)\n${chunk.summary}`)
        mTokens += Math.ceil(chunk.summary.length / 4)
      } else if (budgetLeft >= chunk.tokenEstimate) {
        mLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)})\n${chunk.content}`)
        mTokens += chunk.tokenEstimate
      } else {
        const truncated = chunk.content.substring(0, budgetLeft * 4)
        mLines.push(`[${chunk.source}] (relevance: ${score.toFixed(1)}, truncated)\n${truncated}...`)
        mTokens += budgetLeft
        break
      }
    }

    sections.push(mLines.join('\n\n'))
    usedTokens += mTokens
  }

  return sections.join('\n\n')
}

// ═══════════════════════════════════════════════════════════
// CHUNKING ENGINE — Semantic-aware with overlap
// ═══════════════════════════════════════════════════════════

const CHUNK_TARGET = 1500   // Target ~1500 chars per chunk (~375 tokens)
const CHUNK_MAX = 3000      // Hard max before forced split
const OVERLAP_CHARS = 200   // ~50 token overlap between chunks for context continuity

// Split text at natural boundaries: double newlines > single newlines > sentences > hard cut
function splitAtBoundary(text: string, target: number): number {
  if (text.length <= target) return text.length

  // Search window: look for a break point between 60%-100% of target
  const searchStart = Math.floor(target * 0.6)
  const searchEnd = Math.min(text.length, target)
  const window = text.substring(searchStart, searchEnd)

  // Priority 1: Double newline (paragraph break)
  const paraBreak = window.lastIndexOf('\n\n')
  if (paraBreak >= 0) return searchStart + paraBreak + 2

  // Priority 2: Single newline
  const lineBreak = window.lastIndexOf('\n')
  if (lineBreak >= 0) return searchStart + lineBreak + 1

  // Priority 3: Sentence end (. ! ? followed by space or newline)
  const sentenceMatch = window.match(/.*[.!?]\s/s)
  if (sentenceMatch) return searchStart + sentenceMatch[0].length

  // Priority 4: Hard cut at target
  return target
}

function chunkText(text: string, id: string, source: string, category: ChunkCategory, tier: KnowledgeChunk['tier'], trust: KnowledgeChunk['trust']): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = []

  if (text.length <= CHUNK_MAX) {
    // Small enough for one chunk
    chunks.push({
      id: `${id}-0`,
      source,
      content: text.trim(),
      category,
      timestamp: Date.now(),
      tier,
      trust,
      tokenEstimate: Math.ceil(text.length / 4),
    })
    return chunks
  }

  // Split into overlapping chunks at natural boundaries
  let pos = 0
  while (pos < text.length) {
    const remaining = text.substring(pos)
    const cutPoint = splitAtBoundary(remaining, CHUNK_TARGET)
    const chunkText = remaining.substring(0, cutPoint).trim()

    if (chunkText.length > 0) {
      chunks.push({
        id: `${id}-${chunks.length}`,
        source,
        content: chunkText,
        category,
        timestamp: Date.now(),
        tier,
        trust,
        tokenEstimate: Math.ceil(chunkText.length / 4),
      })
    }

    // Advance with overlap — step back OVERLAP_CHARS so the next chunk
    // starts with context from the end of this one
    pos += Math.max(cutPoint - OVERLAP_CHARS, 1)

    // Safety: if we barely moved, force advance to prevent infinite loop
    if (cutPoint < 10) break
  }

  return chunks
}

// ═══════════════════════════════════════════════════════════
// FILE INGESTION
// ═══════════════════════════════════════════════════════════

// JSON = MEMORY (ChatGPT conversation history, personal interactions)
// Conversation-aware: keeps user+assistant pairs together
export function parseJSONFile(content: string, filename: string): KnowledgeChunk[] {
  const data = JSON.parse(content)
  const allChunks: KnowledgeChunk[] = []

  if (Array.isArray(data)) {
    // ChatGPT export: [{role, content}, ...]
    // Group into conversation turns (user + assistant pairs)
    const turns: string[] = []
    let currentTurn = ''

    for (const item of data) {
      const text = typeof item === 'string' ? item
        : item.content || item.text || item.message || JSON.stringify(item)

      const role = item.role || ''
      const line = role ? `[${role}] ${text}` : text

      // Start new turn at each 'user' message (keeps Q+A pairs together)
      if (role === 'user' && currentTurn.length > 0) {
        turns.push(currentTurn.trim())
        currentTurn = ''
      }
      currentTurn += line + '\n\n'
    }
    if (currentTurn.trim()) turns.push(currentTurn.trim())

    // Now chunk the turns — group small turns together, split large ones
    let buffer = ''
    for (const turn of turns) {
      // If adding this turn would exceed target, flush buffer first
      if (buffer.length > 0 && buffer.length + turn.length > CHUNK_TARGET) {
        allChunks.push(...chunkText(buffer, `mem-${filename}`, filename, 'memory', 'working', 'user-authored'))
        // Keep last few lines as overlap context
        const lines = buffer.split('\n')
        buffer = lines.slice(-3).join('\n') + '\n\n'
      }
      buffer += turn + '\n\n'
    }
    // Flush remaining
    if (buffer.trim()) {
      allChunks.push(...chunkText(buffer, `mem-${filename}`, filename, 'memory', 'working', 'user-authored'))
    }

  } else if (typeof data === 'object') {
    const text = JSON.stringify(data, null, 2)
    allChunks.push(...chunkText(text, `mem-${filename}`, filename, 'memory', 'working', 'user-authored'))
  }

  // De-duplicate IDs (overlap can cause collisions)
  allChunks.forEach((c, i) => { c.id = `mem-${filename}-${i}` })
  return allChunks
}

// JSONL = KNOWLEDGE (dream pings, deep research, theoretical frameworks)
// Each line is a self-contained knowledge fragment — respect those boundaries
export function parseJSONLFile(content: string, filename: string): KnowledgeChunk[] {
  const lines = content.split('\n').filter(l => l.trim())
  const allChunks: KnowledgeChunk[] = []
  let buffer = ''
  let currentSource = filename

  for (const line of lines) {
    try {
      const obj = JSON.parse(line)
      const text = obj.content || obj.text || obj.message || JSON.stringify(obj)
      const src = obj.source || filename
      currentSource = src

      const entry = `${src !== filename ? `[${src}] ` : ''}${text}`

      // If this single entry is huge, chunk it on its own
      if (entry.length > CHUNK_MAX) {
        // Flush buffer first
        if (buffer.trim()) {
          allChunks.push(...chunkText(buffer, `know-${filename}`, currentSource, 'knowledge', 'core', 'verified'))
          buffer = ''
        }
        allChunks.push(...chunkText(entry, `know-${filename}`, src, 'knowledge', 'core', 'verified'))
        continue
      }

      // Group small entries together up to target size
      if (buffer.length > 0 && buffer.length + entry.length > CHUNK_TARGET) {
        allChunks.push(...chunkText(buffer, `know-${filename}`, currentSource, 'knowledge', 'core', 'verified'))
        buffer = ''
      }

      buffer += entry + '\n\n'
    } catch {
      // Non-JSON line — include as raw text
      buffer += line + '\n'
    }
  }

  if (buffer.trim()) {
    allChunks.push(...chunkText(buffer, `know-${filename}`, currentSource, 'knowledge', 'core', 'verified'))
  }

  // De-duplicate IDs
  allChunks.forEach((c, i) => { c.id = `know-${filename}-${i}` })
  return allChunks
}
