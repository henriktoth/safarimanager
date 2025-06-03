import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Lion from '@/sprites/lion'
import Zebra from '@/sprites/zebra'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()

  // using Lion as test carnivore
  vol.fromJSON({
    '/data/lion.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
})

it('shuold walk towards food when hungry', async () => {
  // Arrange
  vol.fromJSON({
    '/data/zebra.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })

  const herbivore = new Lion(0, 0, 1)
  await herbivore.load()
  ;(herbivore as any)._foodLevel = 80
  ;(herbivore as any)._visibleSprites = [
    new Zebra(1, 1, 2),
  ]

  // Act
  herbivore.act(0)

  // Assert
  expect(herbivore.pathTo).toEqual([1, 1])
})
