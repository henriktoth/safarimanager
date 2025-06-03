import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DrawData from '@/drawData'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
})

class TestDrawData extends DrawData {
  getScreenPosition(_: number): [number, number] {
    return [0, 0]
  }
}

describe('loading draw data from json', () => {
  it('should return the correct texture file location', async () => {
    // Arrange
    vol.fromJSON({
      '/resources/test.json': JSON.stringify({
        texture: 'test.webp',
        scale: 1,
        zIndex: 0,
      }),
    })
    const instance = new TestDrawData('safari:test', 0, 0)

    // Act
    await instance.loadJsonData()
    const image = instance.image

    // Assert
    expect(image).toBe('/resources/textures/test.webp')
  })

  it.for([
    0.5,
    1,
    2,
    2.5,
  ])('should calculate the size correctly using scale (scale = %d)', async (scale: number) => {
    // Arrange
    vol.fromJSON({
      [`/resources/test-scale${scale}.json`]: JSON.stringify({
        texture: 'test.webp',
        scale,
        zIndex: 0,
      }),
    })
    const unit = 10
    const instance = new TestDrawData(`safari:test-scale${scale}`, 0, 0)

    // Act
    await instance.loadJsonData()
    const size = instance.getSize(unit)

    // Assert
    expect(size).toBe(scale * unit)
  })

  it.for([
    0,
    1,
    10,
    999,
  ])('should give back the correct zIndex (zIndex = %i)', async (zIndex: number) => {
    // Arrange
    vol.fromJSON({
      [`/resources/test-zindex${zIndex}.json`]: JSON.stringify({
        texture: `test.webp`,
        scale: 1,
        zIndex,
      }),
    })
    const instance = new TestDrawData(`safari:test-zindex${zIndex}`, 0, 0)

    // Act
    await instance.loadJsonData()
    const value = instance.zIndex

    // Assert
    expect(value).toBe(zIndex)
  })
})
