/**
 * Represents the structure of the tile data JSONs.
 */
interface TileJson {
  buyPrice: number
  isObstacle: boolean
  isEdible: boolean
  isWater: boolean
  isAlwaysVisible: boolean
  fallbackTile: string
}
