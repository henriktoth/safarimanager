/**
 * Class representing the SafariButton component.
 *
 * @extends HTMLButtonElement
 */
export default class SafariButton extends HTMLButtonElement {
  private _color!: string
  private _image?: string

  private readonly _initalColor: string
  private readonly _initialImage?: string

  /**
   * Creates an instance of the SafariButton component.
   *
   * The constructor initializes the component.
   *
   * @param color  The color of the button.
   * @param options  The options for the button.
   * @param options.image  The image path of the button.
   * @param options.text  The text of the button.
   * @param options.title  The title of the button.
   */
  constructor(color: string, options: { image?: string, text?: string, title?: string }) {
    super()

    this.title = options.title || ''
    this.textContent = options.text || ''
    this._initalColor = this.color = color
    this._initialImage = this.image = options.image

    this.classList.add('safariButton')
  }

  /**
   * Gets the color of the button.
   *
   * @returns The color of the button.
   */
  public get color(): string {
    return this._color
  }

  /**
   * Sets the color of the button.
   *
   * @param color  The new color of the button.
   */
  public set color(color: string) {
    this._color = color
    this.style.setProperty('--safari-btn-color', this._color)
  }

  /**
   * Gets the image path of the button.
   *
   * @returns The image path of the button.
   */
  public get image(): string | undefined {
    return this._image
  }

  /**
   * Sets the image path of the button.
   *
   * @param image The new path to the image. If undefined, the image will be removed.
   */
  public set image(image: string | undefined) {
    this._image = image
    const img = this.querySelector('img')

    if (!img) {
      if (!this._image)
        return

      const img = document.createElement('img')
      img.src = this._image || ''
      img.alt = this.textContent || ''
      this.appendChild(img)
      return
    }

    if (!this._image) {
      img.remove()
      return
    }

    img.src = this._image
  }

  /**
   * Resets the button to its initial color and image.
   */
  public reset = () => {
    this.color = this._initalColor
    this.image = this._initialImage
  }
}
