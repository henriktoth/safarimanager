import type DrawData from '@/drawData'
import type Shooter from '@/sprites/shooter'
import type Sprite from '@/sprites/sprite'
import type Tile from '@/tiles/tile'
import type Visitor from '@/visitor'
import Animal from '@/sprites/animal'
import Jeep from '@/sprites/jeep'
import Poacher from '@/sprites/poacher'
import Ranger from '@/sprites/ranger'
import Entrance from '@/tiles/entrance'
import Exit from '@/tiles/exit'
import Road from '@/tiles/road'
import Sand from '@/tiles/sand'
import {
  carnivoreRegistry,
  createCarnivore,
  createHerbivore,
  createTile,
  herbivoreRegistry,
  tileRegistry,
} from '@/utils/registry'
import {
  animalDeadSignal,
  shooterDeadSignal,
  tileEatenSignal,
  tourFinishedSignal,
  tourRatingsSignal,
  tourStartSignal,
  updateVisiblesSignal,
} from '@/utils/signal'

/**
 * Represents the map of the safari.
 */
export default class Map {
  private static visibleTileIDs: string[] = []

  private _tiles: Tile[][]
  private _sprites: Sprite[]
  private _width: number
  private _height: number
  private _groups: Array<Record<number, string>>
  private _waitingJeeps: Jeep[]
  private _waitingVisitors: Visitor[]
  private _paths: Tile[][]
  private _totalVisitorCount: number
  private _plantTimer: number
  private _poacherTimer: number

  private _visiblesCache: {
    time: number
    position: [number, number]
    viewDistance: number
    visibleTiles: Tile[]
    visibleSprites: Sprite[]
  }[]

  /**
   * Gets the width of the map in tiles.
   *
   * @returns The width of the map.
   */
  public get width(): number {
    return this._width
  }

  /**
   * Gets the height of the map in tiles.
   *
   * @returns The height of the map.
   */
  public get height(): number {
    return this._height
  }

  /**
   * Gets a list of the group ID-s of sprites on the map.
   *
   * @returns An array of groupID-s.
   */
  public get groups(): Record<number, string>[] {
    return this._groups
  }

  /**
   * Returns the count of herbivores on the map.
   *
   * @returns the number of herbivores
   */
  public getHerbivoreCount(): number {
    let count = 0
    for (const sprite of this._sprites) {
      if (herbivoreRegistry.has(sprite.toString())) {
        count++
      }
    }
    return count
  }

  /**
   * Returns the count of carnivores on the map.
   *
   * @returns the number of carnivores
   */
  public getCarnivoreCount(): number {
    let count = 0
    for (const sprite of this._sprites) {
      if (carnivoreRegistry.has(sprite.toString())) {
        count++
      }
    }
    return count
  }

  /**
   * Gets the number of visitors that had tours.
   *
   * @returns The number of visitors.
   */
  public get totalVisitorCount(): number {
    return this._totalVisitorCount
  }

  /**
   * Gets the number of jeeps waiting in the backlog.
   *
   * @returns The number of waiting jeeps.
   */
  public get waitingJeepCount(): number {
    return this._waitingJeeps.length
  }

  /**
   * Creates an instance of the Map.
   *
   * @param width - The width of the map in tiles.
   * @param height - The height of the map in tiles.
   */
  constructor(width: number, height: number) {
    this._width = width
    this._height = height
    this._tiles = []
    this._sprites = []
    this._groups = []
    this._waitingJeeps = []
    this._waitingVisitors = []
    this._paths = []
    this._totalVisitorCount = 0
    this._visiblesCache = []
    this._plantTimer = 0
    this._poacherTimer = 0

    animalDeadSignal.connect((animal: Animal) => {
      this.removeSprite(animal)
    })
    shooterDeadSignal.connect((shooter: Shooter) => {
      this.removeSprite(shooter)
    })
    tourFinishedSignal.connect((jeep: Jeep) => {
      this.removeSprite(jeep)
      this._waitingJeeps.push(jeep)
      this._totalVisitorCount += 4
    })

    tileEatenSignal.connect(async (tile: Tile) => {
      const [x, y] = tile.position
      const fallbackTile = createTile(tile.fallbackTile, x, y)

      if (fallbackTile) {
        await fallbackTile.load()
        this.placeTile(fallbackTile)
      }
    })

    updateVisiblesSignal.connect((sprite: Sprite, important: boolean = false) => {
      const [x, y] = sprite.position.map(Math.floor) as [number, number]
      const vd = sprite.viewDistance

      const idx = this._visiblesCache.findIndex(v =>
        v.position[0] === x && v.position[1] === y && v.viewDistance === vd,
      )

      const visibleTiles = this.getVisibleTiles(sprite)
      const visibleSprites = this.getVisibleSprites(sprite)

      if (idx >= 0 && !important) {
        const cached = this._visiblesCache[idx]
        sprite.updateVisibles(cached.visibleTiles, cached.visibleSprites)
        cached.time = 0
      }
      else {
        if (idx >= 0) {
          this._visiblesCache.splice(idx, 1)
        }
        this._visiblesCache.push({
          time: 0,
          position: [x, y],
          viewDistance: vd,
          visibleTiles,
          visibleSprites,
        })
        sprite.updateVisibles(visibleTiles, visibleSprites)
      }
    })
  }

  /**
   * Loads the map by creating and loading draw data for each tile.
   *
   * @param animals - The number of animals to generate.
   * @param tiles - The number of tiles to generate.
   * @returns A promise that resolves when all tiles have been loaded.
   */
  public loadMap = async (animals: number = 5, tiles: number = 10): Promise<void> => {
    for (let i = 0; i < this._width; i++) {
      this._tiles[i] = []
      for (let j = 0; j < this._height; j++) {
        this._tiles[i][j] = new Sand(i, j)
        await this._tiles[i][j].load()
      }
    }
    for (const [id, TileClass] of tileRegistry.entries()) {
      const tile = new TileClass(0, 0)
      await tile.load()

      if (tile.isAlwaysVisible) {
        Map.visibleTileIDs.push(id)
      }
    }

    await this.tileGeneration(tiles)
    await this.animalGeneration(animals)

    this._tiles[0][0] = new Entrance(0, 0)
    await this._tiles[0][0].load()

    const w = this._tiles.length - 1
    const h = this._tiles[0].length - 1
    this._tiles[w][h] = new Exit(w, h)
    await this._tiles[w][h].load()

    // for (let i = 1; i <= w; i++) {
    //   this._tiles[i][0] = new Road(i, 0)
    //   await this._tiles[i][0].load()
    // }
    // for (let j = 1; j < h; j++) {
    //   this._tiles[w][j] = new Road(w, j)
    //   await this._tiles[w][j].load()
    // }
  }

  /**
   * Generates tiles on the map at random positions.
   *
   * @param n - The number of tiles to generate.
   * @param type - The type of tile to generate.
   */
  private tileGeneration = async (n: number, type: string = 'pond') => {
    for (let i = 0; i < n; i++) {
      for (let attempts = 0; attempts < 3; attempts++) {
        const x = Math.floor(Math.random() * this._width)
        const y = Math.floor(Math.random() * this._height)
        const currentTile = this.getTileAt(x, y)

        if (currentTile instanceof Sand) {
          const tile = createTile(`safari:${type}`, x, y)
          if (tile) {
            await tile.load()
            this.placeTile(tile)
          }
          break
        }
      }
    }
  }

  /**
   * Generates a given number of animals on the map.
   *
   * @param n - The number of animals to generate.
   */
  private animalGeneration = async (n: number) => {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(Math.random() * this._width)
      const y = Math.floor(Math.random() * this._height)
      const animalId = Array.from(herbivoreRegistry.keys())[Math.floor(Math.random() * herbivoreRegistry.size)]
      const animal = createHerbivore(animalId, x, y, 0)
      if (animal) {
        await animal.load()
        this.addSprite(animal)
      }
    }

    for (let i = 0; i < n; i++) {
      const x = Math.floor(Math.random() * this._width)
      const y = Math.floor(Math.random() * this._height)
      const animalId = Array.from(carnivoreRegistry.keys())[Math.floor(Math.random() * carnivoreRegistry.size)]
      const animal = createCarnivore(animalId, x, y, 0)
      if (animal) {
        await animal.load()
        this.addSprite(animal)
      }
    }
  }

  /**
   * Adds a group ID to the list of groups.
   * @param group group ID to add.
   */
  public addGroup = (group: number, id: string) => {
    for (const elem of this._groups) {
      if (Number(Object.keys(elem)[0]) === group)
        return
    }
    this._groups.push({ [group]: id })
  }

  /**
   * Updates the state of all sprites on the map by one tick.
   *
   * @param dt - The time delta since the last update.
   */
  public tick = (dt: number, isOpen: boolean) => {
    const jeepsAtExit = this._sprites.filter(
      sprite => sprite instanceof Jeep
        && Math.floor(sprite.position[0]) === this._width - 1
        && Math.floor(sprite.position[1]) === this._height - 1,
    ) as Jeep[]

    for (const jeep of jeepsAtExit) {
      const ratings = jeep.getRatings()
      tourRatingsSignal.emit(ratings)
    }

    this._visiblesCache.forEach(visible => visible.time += dt)
    this._visiblesCache = this._visiblesCache.filter(visible => visible.time < 1)

    this._sprites.forEach(sprite => sprite.act(dt))
    this.generatePlants(dt)
    this.spawnPoacher(dt)

    if (!isOpen)
      return

    if (this._waitingVisitors.length >= 4) {
      const jeep = this._waitingJeeps.shift()
      if (jeep) {
        this._sprites.push(jeep)
        for (let i = 0; i < 4; i++)
          jeep.addPassenger(this._waitingVisitors.shift()!)
        jeep.choosePath(this._paths)
        tourStartSignal.emit()
      }
    }
  }

  /**
   * Generates plants on the map at random positions at random time.
   * @param dt - The time delta since the last update.
   */
  private generatePlants = async (dt: number) => {
    this._plantTimer += dt

    if (this._plantTimer >= 480 * (Math.random() * (2.5 - 1) + 1)) {
      this._plantTimer = 0

      const plantTypes = ['acacia', 'grass', 'oak']
      const chosenType = plantTypes[Math.floor(Math.random() * plantTypes.length)]

      this.tileGeneration(1, chosenType)
    }
  }

  /**
   * Spawns a poacher on the map at random positions at random time.
   * @param dt - The time delta since the last update.
   */
  private spawnPoacher = async (dt: number) => {
    this._poacherTimer += dt

    if (this._poacherTimer >= 720 * (Math.random() * (2 - 1) + 1)) {
      this._poacherTimer = 0
      const x = Math.floor(Math.random() * this._width)
      const y = Math.floor(Math.random() * this._height)

      const poacher = new Poacher(x, y, [this._width - 1, this._height - 1])
      await poacher.load()
      this.addSprite(poacher)
    }
  }

  /**
   * Method to spawn offspring for groups of animals with a small chance.
   */
  public spawnGroupOffspring = async () => {
    for (const groupId of this.getMatableGroups()) {
      const groupObj = this.groups.find(obj => Object.prototype.hasOwnProperty.call(obj, groupId))
      const animalID = groupObj ? groupObj[groupId] : undefined
      if (Math.random() < 0.001) {
        const [x, y] = this.getCenterOfGroup(groupId)
        if (animalID && herbivoreRegistry.has(animalID)) {
          const newAnimal = createHerbivore(animalID, x, y, groupId)
          if (newAnimal) {
            newAnimal.group = groupId
            await newAnimal.load()
            this.addSprite(newAnimal)
          }
        }
        if (animalID && carnivoreRegistry.has(animalID)) {
          const newAnimal = createCarnivore(animalID, x, y, groupId)
          if (newAnimal) {
            newAnimal.group = groupId
            await newAnimal.load()
            this.addSprite(newAnimal)
          }
        }
      }
    }
  }

  /**
   * Gets the center of a group of animals.
   *
   * @param groupId - The ID of the group.
   * @returns The center coordinates of the group as [x, y].
   */
  public getCenterOfGroup = (groupId: number): [number, number] => {
    const groupAnimals = this._sprites.filter(
      sprite => sprite instanceof Animal && sprite.isAdult && sprite.group === groupId,
    ) as Animal[]
    const avgX = groupAnimals.reduce((sum, animal) => sum + animal.position[0], 0) / groupAnimals.length
    const avgY = groupAnimals.reduce((sum, animal) => sum + animal.position[1], 0) / groupAnimals.length
    const x = Math.round(avgX)
    const y = Math.round(avgY)
    return [x, y]
  }

  /**
   * Gets the groups of animals that can mate.
   *
   * @returns An array of group IDs that can mate.
   */
  public getMatableGroups = () => {
    const groupAdultCount: Record<number, number> = {}
    for (const sprite of this._sprites) {
      if (sprite instanceof Animal && sprite.isAdult) {
        const groupId = sprite.group
        groupAdultCount[groupId] = (groupAdultCount[groupId] || 0) + 1
      }
    }
    const MatableGroups = Object.entries(groupAdultCount)
      .filter(([_, count]) => count >= 2)
      .map(([groupId]) => Number(groupId))

    return MatableGroups
  }

  /**
   * Gets the tiles that are visible to a given sprite.
   *
   * @param sprite - The sprite to check visibility for.
   * @returns An array of visible tiles.
   */
  private getVisibleTiles = (sprite: Sprite): Tile[] => {
    const viewdistance = sprite.viewDistance
    const [x, y] = sprite.position
    const cellX = Math.floor(x)
    const cellY = Math.floor(y)
    const tiles: Tile[] = []

    for (let dx = -viewdistance; dx <= viewdistance; dx++) {
      for (let dy = -viewdistance; dy <= viewdistance; dy++) {
        const tileX = Math.floor(cellX + dx)
        const tileY = Math.floor(cellY + dy)
        if (tileX >= 0 && tileX < this._width && tileY >= 0 && tileY < this._height) {
          tiles.push(this._tiles[tileX][tileY])
        }
      }
    }
    return tiles
  }

  /**
   * Gets the sprites that are visible to a given sprite.
   *
   * @param sprite - The sprite to check visibility for.
   * @returns An array of visible sprites.
   */
  public getVisibleSprites = (sprite: Sprite): Sprite[] => {
    const viewdistance = sprite.viewDistance
    const [x, y] = sprite.position
    const cellX = Math.floor(x)
    const cellY = Math.floor(y)

    return this._sprites.filter((otherSprite) => {
      if (otherSprite === sprite)
        return false
      const [otherX, otherY] = otherSprite.position
      return (
        otherX >= cellX - viewdistance
        && otherX <= cellX + viewdistance
        && otherY >= cellY - viewdistance
        && otherY <= cellY + viewdistance
      )
    })
  }

  /**
   * Gets the draw data for all tiles on the map.
   *
   * @param isNight - Indicates whether it is night or not.
   * @returns An array of draw data for all the tiles on the map. (At night only the visible tiles are drawn.)
   */
  public getAllDrawData = (isNight: boolean): DrawData[] => {
    const drawDatas: DrawData[] = []
    const included = new Set<string>()
    if (!isNight) {
      for (let i = 0; i < this._width; i++) {
        for (let j = 0; j < this._height; j++) {
          drawDatas.push(this._tiles[i][j].drawData)
        }
      }
      for (const sprite of this._sprites) {
        if (sprite instanceof Poacher) {
          if (sprite.isVisible)
            drawDatas.push(sprite.drawData)
        }
        else {
          drawDatas.push(sprite.drawData)
        }
      }

      return drawDatas
    }

    for (let i = 0; i < this._width; i++) {
      for (let j = 0; j < this._height; j++) {
        const tile = this._tiles[i][j]
        const tileId = tile.toString()
        if (!Map.visibleTileIDs.includes(tileId))
          continue

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = i + dx
            const ny = j + dy
            if (!(nx >= 0 && nx < this._width
              && ny >= 0 && ny < this._height
            )) {
              continue
            }

            const key = `${nx},${ny}`
            if (included.has(key))
              continue

            drawDatas.push(this._tiles[nx][ny].drawData)
            included.add(key)

            for (const sprite of this._sprites) {
              if (sprite instanceof Animal
                && sprite.hasChip
                && !included.has(sprite.regNumber.toString())
              ) {
                drawDatas.push(sprite.drawData)
                continue
              }

              const [x, y] = sprite.position
              const cellX = Math.floor(x)
              const cellY = Math.floor(y)
              if (!(cellX === nx && cellY === ny))
                continue

              const id = sprite.regNumber.toString()
              if (included.has(id))
                continue

              included.add(id)

              if (sprite instanceof Poacher) {
                if (sprite.isVisible)
                  drawDatas.push(sprite.drawData)
              }
              else {
                drawDatas.push(sprite.drawData)
              }
            }
          }
        }
      }
    }

    return drawDatas
  }

  /**
   * Places a tile on the map at the correct position.
   *
   * @param tile - The tile to place on the map.
   */
  public placeTile = (tile: Tile) => {
    const [x, y] = tile.position
    this._tiles[x][y] = tile
  }

  /**
   * Adds a sprite to the map.
   * @param sprite - The sprite to add to the map.
   */
  public addSprite = (sprite: Sprite) => {
    this._sprites.push(sprite)
  }

  /**
   * Adds a jeep to the jeep backlog.
   *
   * @param jeep - The jeep to add.
   */
  public addNewJeep = (jeep: Jeep) => {
    this._waitingJeeps.push(jeep)
  }

  /**
   * Removes a sprite from the map.
   *
   * @param sprite - The sprite to remove from the map.
   */
  public removeSprite = (sprite: Sprite) => {
    this._sprites = this._sprites.filter(s => s !== sprite)
  }

  /**
   * Gets the tile at the specified coordinates.
   *
   * @param x The x coordinate of the tile.
   * @param y The y coordinate of the tile.
   * @returns The tile at the specified coordinates.
   */
  public getTileAt = (x: number, y: number) => {
    return this._tiles[x][y]
  }

  /**
   * Gets the sprite at the specified coordinates.
   *
   * @param x The x coordinate of the sprite.
   * @param y The y coordinate of the sprite.
   * @returns The tile at the specified coordinates.
   */
  public getSpritesAt = (x: number, y: number): Sprite[] => {
    return this._sprites.filter((sprite) => {
      const [spriteX, spriteY] = sprite.position
      const spriteSize = sprite.size / 100
      return (
        spriteX >= x - spriteSize
        && spriteX <= x
        && spriteY >= y - spriteSize
        && spriteY <= y
      )
    })
  }

  /**
   * Queues a visitor to the waiting list.
   *
   * @param visitor - The visitor to queue.
   */
  public queueVisitor = (visitor: Visitor) => {
    this._waitingVisitors.push(visitor)
  }

  /**
   * Finds a path from the entrance to the exit using depth-first search (DFS).
   *
   * @returns True if there is a path from the entrance to the exit, false otherwise.
   */
  public planRoads = (): boolean => {
    this._paths = []
    this.dfs(this._tiles[0][0], [], new Set())
    return this._paths.length > 0
  }

  /**
   * Finds a path from the entrance to the exit using depth-first search (DFS).
   *
   * @param current The current tile being visited.
   * @param path The current path being explored.
   * @param visited A set of visited tiles to avoid cycles.
   */
  private dfs = (
    current: Road | Entrance | Exit,
    path: (Road | Entrance | Exit)[],
    visited: Set<[number, number]>,
  ) => {
    if (current instanceof Exit) {
      this._paths.push([...path, current])
      return
    }

    visited.add(current.position)

    for (const neighbor of this.neighbors(current)) {
      if (!visited.has(neighbor.position)) {
        this.dfs(neighbor, [...path, current], visited)
      }
    }

    visited.delete(current.position)
  }

  /**
   * Gets the neighbors of a given tile.
   *
   * @param road - The tile to get neighbors for.
   * @returns An array of neighboring tiles.
   */
  private neighbors = (road: Road | Entrance | Exit): (Road | Entrance | Exit)[] => {
    const [x, y] = road.position
    const neighbors: (Road | Entrance | Exit)[] = []

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (Math.abs(dx) !== Math.abs(dy)) {
          const nx = x + dx
          const ny = y + dy
          if (
            nx >= 0 && nx < this._width
            && ny >= 0 && ny < this._height
          ) {
            const neighbor = this._tiles[nx][ny]
            if (neighbor instanceof Road || neighbor instanceof Entrance || neighbor instanceof Exit) {
              neighbors.push(neighbor)
            }
          }
        }
      }
    }

    return neighbors
  }

  /**
   * Gets the total salary of all rangers on the map.
   * @returns The total salary of all rangers.
   */
  public getRangerSalary = (): number => {
    return this._sprites
      .filter(sprite => sprite instanceof Ranger)
      .reduce((total, ranger) => total + (ranger as Ranger).salary, 0)
  }
}
