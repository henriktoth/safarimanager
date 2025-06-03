import { vol } from 'memfs'
import { beforeEach, expect, it, vi } from 'vitest'
import Sand from '@/tiles/sand'
import { clearJsonCache } from '@/utils/load'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()
  clearJsonCache()
})

it('should have a position set in the constructor', async () => {
  // Arrange
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.position).toEqual([0, 0])
})

it.for([
  0,
  10,
  100,
  200,
  500,
  1000,
  10000,
])('should have a buyPrice set in the json', async (buyPrice) => {
  // Arrange
  vol.fromJSON({
    '/data/sand.json': JSON.stringify({
      buyPrice,
      isObstacle: false,
      isWater: false,
      isAlwaysVisible: false,
      fallbackTile: 'safari:sand',
    }),
  })
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.buyPrice).toEqual(buyPrice)
})

it('should have isObstacle set in the json', async () => {
  // Arrange
  vol.fromJSON({
    '/data/sand.json': JSON.stringify({
      buyPrice: 100,
      isObstacle: true,
      isWater: false,
      isAlwaysVisible: false,
      fallbackTile: 'safari:sand',
    }),
  })
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.isObstacle).toEqual(true)
})

it('should have isWater set in the json', async () => {
  // Arrange
  vol.fromJSON({
    '/data/sand.json': JSON.stringify({
      buyPrice: 100,
      isObstacle: false,
      isWater: true,
      isAlwaysVisible: false,
      fallbackTile: 'safari:sand',
    }),
  })
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.isWater).toEqual(true)
})

it('should have isAlwaysVisible set in the json', async () => {
  // Arrange
  vol.fromJSON({
    '/data/sand.json': JSON.stringify({
      buyPrice: 100,
      isObstacle: false,
      isWater: false,
      isAlwaysVisible: true,
      fallbackTile: 'safari:sand',
    }),
  })
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.isAlwaysVisible).toEqual(true)
})

it.for([
  'safari:sand',
  'safari:pond',
  'safari:grass',
])('should have a fallbackTile set in the json', async (fallbackTile) => {
  // Arrange
  vol.fromJSON({
    '/data/sand.json': JSON.stringify({
      buyPrice: 100,
      isObstacle: false,
      isWater: false,
      isAlwaysVisible: false,
      fallbackTile,
    }),
  })
  const tile = new Sand(0, 0)

  // Act
  await tile.load()

  // Assert
  expect(tile.fallbackTile).toEqual(fallbackTile)
})
