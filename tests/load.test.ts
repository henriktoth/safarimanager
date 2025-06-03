import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearJsonCache, loadJson } from '@/utils/load'

import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  vi.resetModules()
  clearJsonCache()
})

describe('loading json data', () => {
  it('should load correct json data', async () => {
    // Arrange
    const file = 'resources/test'
    vol.fromJSON({
      [`/${file}.json`]: JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })

    // Act
    const data = await loadJson(file)

    // Assert
    expect(data).toEqual({
      texture: 'test.webp',
      scale: 1,
      zIndex: 0,
    })
  })

  it('should load data from the given default json', async () => {
    // Arrange
    const file = 'resources/test'
    vol.fromJSON({
      [`/${file}.json`]: JSON.stringify({
        default: 'test',
      }),
      [`/${file}.default.json`]: JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })

    // Act
    const data = await loadJson(file)

    // Assert
    expect(data).toEqual({
      texture: 'test.webp',
      scale: 1,
      zIndex: 0,
    })
  })

  it('should override the default json data with the given values', async () => {
    // Arrange
    const file = 'resources/test'
    vol.fromJSON({
      [`/${file}.json`]: JSON.stringify({
        default: 'test',
        scale: 2,
        texture: 'another.webp',
      }),
      [`/${file}.default.json`]: JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })

    // Act
    const data = await loadJson(file)

    // Assert
    expect(data).toEqual({
      texture: 'another.webp',
      scale: 2,
      zIndex: 0,
    })
  })

  it('should load default json from any base directory', async () => {
    // Arrange
    const file = 'data/test'
    vol.fromJSON({
      [`/${file}.json`]: JSON.stringify({
        default: 'test',
      }),
      [`/${file}.default.json`]: JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })

    // Act
    const data = await loadJson(file)

    // Assert
    expect(data).toEqual({
      texture: 'test.webp',
      scale: 1,
      zIndex: 0,
    })
  })
})
