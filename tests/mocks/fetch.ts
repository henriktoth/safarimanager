import { vol } from 'memfs'
import { vi } from 'vitest'

const mockFetch = vi.fn().mockImplementation(async (url: string) => {
  try {
    const fileExists = vol.existsSync(url)
    if (!fileExists) {
      return {
        ok: true,
        json: async () => '',
      }
    }

    const content = vol.readFileSync(url, 'utf-8') as string
    const parsedContent = JSON.parse(content)

    return {
      ok: true,
      json: async () => parsedContent,
    }
  }
  catch (error) {
    return {
      ok: false,
      error,
    }
  }
})

export default mockFetch
