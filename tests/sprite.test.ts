import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Bison from '@/sprites/bison'
import Zebra from '@/sprites/zebra'
import { clearJsonCache } from '@/utils/load'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  clearJsonCache()

  // using Zebra as test sprite
  vol.fromJSON({
    '/data/zebra.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
})

describe('sprite properties', () => {
  it.for([
    [0, 0],
    [1, 1],
    [10, 10],
  ],
  )('should have a position set in the constructor', async ([x, y]) => {
    // Arrange
    const sprite = new Zebra(x, y, 1)

    // Act
    await sprite.load()

    // Assert
    expect(sprite.position).toEqual([x, y])
  })

  it.for([
    0,
    10,
    100,
    120,
    150,
    200,
  ])('should have a size set in the json', async (size) => {
    // Arrange
    vol.fromJSON({
      '/data/bison.json': JSON.stringify({
        buyPrice: 100,
        viewDistance: 10,
        speed: 10,
        size,
      }),
    })
    const sprite = new Bison(0, 0, 1)

    // Act
    await sprite.load()

    // Assert
    expect(sprite.size).toEqual(size)
  })

  it.for([
    1,
    2,
    3,
    5,
    10,
    20,
  ])('should have a speed set in the json', async (speed) => {
    // Arrange
    vol.fromJSON({
      '/data/bison.json': JSON.stringify({
        buyPrice: 100,
        viewDistance: 10,
        speed,
        size: 1,
      }),
    })
    const sprite = new Bison(0, 0, 1)

    // Act
    await sprite.load()

    // Assert
    expect(sprite.speed).toEqual(speed)
  })

  it.for([
    0,
    1,
    10,
    50,
    100,
    1000,
    10000,
  ])('should have a buy price set in the json', async (buyPrice) => {
    // Arrange
    vol.fromJSON({
      '/data/bison.json': JSON.stringify({
        buyPrice,
        viewDistance: 10,
        speed: 10,
        size: 1,
      }),
    })
    const sprite = new Bison(0, 0, 1)

    // Act
    await sprite.load()

    // Assert
    expect(sprite.buyPrice).toEqual(buyPrice)
  })

  it.for([
    0,
    1,
    3,
    5,
    10,
    50,
    100,
  ])('should have a view distance set in the json', async (viewDistance) => {
    // Arrange
    vol.fromJSON({
      '/data/bison.json': JSON.stringify({
        buyPrice: 100,
        viewDistance,
        speed: 10,
        size: 1,
      }),
    })
    const sprite = new Bison(0, 0, 1)

    // Act
    await sprite.load()

    // Assert
    expect(sprite.viewDistance).toEqual(viewDistance)
  })

  it('should have a different regNumnber for each sprite', async () => {
    // Arrange
    const sprite1 = new Zebra(0, 0, 1)
    const sprite2 = new Zebra(0, 0, 1)

    // Act
    await sprite1.load()
    await sprite2.load()

    // Assert
    expect(sprite1.regNumber).not.toEqual(sprite2.regNumber)
  })
})
