import { vol } from 'memfs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Zebra from '@/sprites/zebra'
import mockFetch from './mocks/fetch'

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vol.reset()

  // using Zebra as test animal
  vol.fromJSON({
    '/data/zebra.json': JSON.stringify({
      buyPrice: 100,
      viewDistance: 10,
      speed: 10,
      size: 1,
    }),
  })
})

describe('animal act function', () => {
  it.for(
    [1, 2, 3, 4, 5],
  )('should increase age by dt=%p', async (dt) => {
    // Arrange
    const animal = new Zebra(0, 0, 1)
    const initialAge = animal.age
    await animal.load()

    // Act
    animal.act(dt)

    // Assert
    expect(animal.age).toBe(initialAge + dt / 1440)
  })

  it('should decrement restingTime and not move when restingTime > 0', async () => {
    // Arrange
    const animal = new Zebra(0, 0, 1);
    (animal as any)._restingTime = 2
    await animal.load()

    // Act
    animal.act(1)

    // Assert
    expect((animal as any)._restingTime).toBe(1)
    expect(animal.position).toEqual([0, 0])
  })

  it('should set velocity towards pathTo based on speed and direction', async () => {
    // Arrange
    const animal = new Zebra(0, 0, 1)
    await animal.load()
    animal.pathTo = [10, 0]
    animal.position = [0, 0]

    // Act
    animal.act(1)

    // Assert
    expect(animal.velocity[0]).toBeCloseTo(10)
    expect(animal.velocity[1]).toBeCloseTo(0)
  })

  it('should move position towards pathTo according to velocity and dt', async () => {
    // Arrange
    const animal = new Zebra(9, 0, 1)
    await animal.load()
    animal.pathTo = [10, 0]

    // Act
    animal.act(1)

    // Assert
    expect(animal.position[0]).toBeCloseTo(10)
    expect(animal.position[1]).toBeCloseTo(0)
  })

  it('should snap to pathTo if moveX and moveY would overshoot', async () => {
    // Arrange
    const animal = new Zebra(0, 0, 1)
    await animal.load();
    (animal as any)._jsonData.speed = 100
    animal.pathTo = [5, 0]
    animal.position = [0, 0]

    // Act
    animal.act(1)

    // Assert
    expect(animal.position[0]).toBeCloseTo(5)
    expect(animal.position[1]).toBeCloseTo(0)
  })

  it('should rest after reaching its destination', async () => {
    // Arrange
    const animal = new Zebra(0, 0, 1)
    await animal.load()
    animal.pathTo = [0, 0]

    // Act
    animal.act(0)

    // Assert
    expect((animal as any).isResting(0)).toBe(true)
  })

  it('should move towards water if thirsty', async () => {
    // Arrange
    const animal = new Zebra(0, 0, 1)
    await animal.load()
    ;(animal as any)._hydrationLevel = 70
    ;(animal as any)._seenWaterPositions.add([1, 1])

    // Act
    animal.act(0)

    // Assert
    expect(animal.pathTo).toEqual([1, 1])
  })
})
