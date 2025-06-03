import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Jeep from '@/sprites/jeep'
import Road from '@/tiles/road'
import { clearJsonCache } from '@/utils/load'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  clearJsonCache()
})

it.for([
  0,
  10,
  100,
  200,
  1000,
  100000,
])('should have a buyPrice set in the json', async (buyPrice) => {
  // Arrange
  vol.fromJSON({
    '/data/jeep.json': JSON.stringify({
      buyPrice,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
  const jeep = new Jeep()

  // Act
  await jeep.load()

  // Assert
  expect(jeep.buyPrice).toEqual(buyPrice)
})

it('should have its pathTo set to undefined when no path is set', async () => {
  // Arrange
  const jeep = new Jeep()

  // Act
  const pathTo = jeep.pathTo

  // Assert
  expect(pathTo).toBeUndefined()
})

it('should choose a path from the given paths', async () => {
  // Arrange
  vol.fromJSON({
    '/data/jeep.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
  const jeep = new Jeep()
  await jeep.load()

  const paths = [[
    new Road(0, 0),
    new Road(1, 0),
    new Road(2, 0),
  ]]

  // Act
  jeep.choosePath(paths)

  // Assert
  expect(jeep.pathTo).toBeDefined()
  expect(jeep.pathTo!).toEqual(paths[0][0].position)
})

it('should move towards the next tile in the path', async () => {
  // Arrange
  vol.fromJSON({
    '/data/jeep.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
  const jeep = new Jeep()
  await jeep.load()

  const paths = [[
    new Road(1, 0),
    new Road(2, 0),
  ]]
  jeep.choosePath(paths)

  // Act
  jeep.act(1)

  // Assert
  expect(jeep.position).toEqual([1, 0])
})
