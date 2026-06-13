// Book discovery (Google Books API, free, no key needed for basic search)
// + affiliate link building. This is the revenue layer: recommendations and
// search results link out to a store with your affiliate tag.

const AMAZON_TAG = import.meta.env.VITE_AMAZON_TAG || 'readaloud-20'

export function amazonLink(title, author = '') {
  const q = encodeURIComponent(`${title} ${author}`.trim())
  return `https://www.amazon.com/s?k=${q}&i=stripbooks&tag=${AMAZON_TAG}`
}

// Search Google Books for metadata + cover thumbnails.
export async function searchBooks(query, max = 12) {
  if (!query) return []
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${max}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Book search failed')
  const data = await res.json()
  return (data.items || []).map(it => {
    const v = it.volumeInfo || {}
    return {
      id: it.id,
      title: v.title || 'Untitled',
      author: (v.authors || []).join(', '),
      thumb: v.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      year: (v.publishedDate || '').slice(0, 4),
      buy: amazonLink(v.title || '', (v.authors || [])[0] || '')
    }
  })
}

// Naive "what next" recommendations: take the most recently completed book's
// author/title words and search for related titles. Falls back to a curated
// calm-reading list when there's no history yet.
const FALLBACK = [
  { title: 'Atomic Habits', author: 'James Clear' },
  { title: 'Why We Sleep', author: 'Matthew Walker' },
  { title: 'The Comfort Book', author: 'Matt Haig' },
  { title: 'The Secret Garden', author: 'Frances Hodgson Burnett' }
]

export async function recommend(books) {
  const completed = Object.values(books || {})
    .filter(b => b.status === 'completed')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]

  if (completed && completed.title && !/^Scanned page/.test(completed.title)) {
    try {
      const results = await searchBooks(completed.author || completed.title, 8)
      if (results.length) return results
    } catch { /* fall through to fallback */ }
  }
  return FALLBACK.map(b => ({
    id: b.title,
    title: b.title,
    author: b.author,
    thumb: '',
    buy: amazonLink(b.title, b.author)
  }))
}
