import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Zebra from '@/sprites/zebra'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()

  // using Zebra as test herbivore
  vol.fromJSON({
    '/data/zebra.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
})

it('shuold walk towards food when hungry', async () => {
  // Arrange
  const herbivore = new Zebra(0, 0, 1)
  await herbivore.load()
  ;(herbivore as any)._foodLevel = 80
  ;(herbivore as any)._seenFoodPositions.add([1, 1])

  // Act
  herbivore.act(0)

  // Assert
  expect(herbivore.pathTo).toEqual([1, 1])
})
