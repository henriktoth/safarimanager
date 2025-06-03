import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TileDrawData from '@/tileDrawData'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
})

describe('getting draw data screen position', () => {
  it.for([
    [0, 0, 1],
    [0, 0, 10],
    [0, 0, 100],
    [1, 0, 1],
    [1, 0, 10],
    [1, 0, 100],
    [0, 2, 1],
    [0, 2, 10],
    [0, 2, 100],
    [300, 0, 1],
    [300, 0, 10],
    [300, 0, 100],
    [0, 400, 1],
    [0, 400, 10],
    [0, 400, 100],
  ])('should return the correct screen positions based on unit (position = [%i, %i], unit = %i)', async ([x, y, unit]) => {
    // Arrange
    vol.fromJSON({
      '/resources/test.json': JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })
    const instance = new TileDrawData('safari:test', x, y)

    // Act
    await instance.loadJsonData()
    const position = instance.getScreenPosition(unit)

    // Assert
    expect(position).toStrictEqual([x * unit, y * unit])
  })
})
