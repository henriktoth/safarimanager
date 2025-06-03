/**
 * Interface representing an entity that can be shot by a `Shooter`.
 */
interface Shootable {
  /**
   * Called when the entity is shot by a shooter.
   *
   * @param shooter - The shooter attempting to shoot the entity.
   * @returns `true` if the shot has an effect, `false` otherwise.
   */
  getShotBy: (shooter: Shooter) => boolean
}
