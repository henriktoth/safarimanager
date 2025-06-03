import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Map from '@/map'
import Jeep from '@/sprites/jeep'
import Road from '@/tiles/road'
import { clearJsonCache } from '@/utils/load'
import Visitor from '@/visitor'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  clearJsonCache()
})

it('should not throw if there are no sprites', async () => {
  // Arrange
  const map = new Map(3, 3)

  // Act
  await map.loadMap()

  // Assert
  expect(() => map.tick(1, true)).not.toThrow()
})

it('should start a tour if there are avaliable jeep and 4 visitors waiting', async () => {
  // Arrange
  vol.fromJSON({
    '/data/jeep.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
    '/data/road.json': JSON.stringify({
      buyPrice: 100,
      isAlwaysVisible: true,
      isObstacle: false,
      isWater: false,
      fallBackTile: 'safari:sand',
    }),
    '/data/sand.json': JSON.stringify({
      buyPrice: 100,
      isAlwaysVisible: false,
      isObstacle: false,
      isWater: false,
      fallBackTile: 'safari:sand',
    }),
    '/data/entrance.json': JSON.stringify({
      buyPrice: 100,
      isAlwaysVisible: false,
      isObstacle: false,
      isWater: false,
      fallBackTile: 'safari:sand',
    }),
    '/data/exit.json': JSON.stringify({
      buyPrice: 100,
      isAlwaysVisible: false,
      isObstacle: false,
      isWater: false,
      fallBackTile: 'safari:sand',
    }),
  })

  const map = new Map(30, 30)
  await map.loadMap()

  const jeep = new Jeep()
  await jeep.load()

  ;(map as any)._paths = [[
    new Road(0, 0),
    new Road(1, 0),
    new Road(2, 0),
  ]]
  map.addNewJeep(jeep)

  for (let i = 0; i < 4; i++)
    map.queueVisitor(new Visitor())

  // Act
  map.tick(0, true)

  // Assert
  expect(map.waitingJeepCount).toBe(0)
  expect((map as any)._waitingVisitors).toHaveLength(0)
})
