import type DrawData from '@/drawData'
import { exit } from '@tauri-apps/plugin-process'
import SafariButton from '@/safariButton'
import SafariModel from '@/safariModel'
import SpriteDrawData from '@/spriteDrawData'
import { calcCoords, calcGridPos } from '@/utils/calculate'
import { loadImage } from '@/utils/load'
import {
  carnivoreRegistry,
  createCarnivore,
  createHerbivore,
  createTile,
  herbivoreRegistry,
  tileRegistry,
} from '@/utils/registry'
import {
  goalMetSignal,
  losingSignal,
} from '@/utils/signal'
import '@/tiles'
import '@/sprites'
import '@/goals'

/**
 * Class representing the SafariView component.
 *
 * @extends HTMLElement
 */
export default class SafariView extends HTMLElement {
  private _gameModel?: SafariModel
  private _isPaused: boolean
  private _renderContext: CanvasRenderingContext2D
  private _unit: number
  private _labelTimer: number
  private _frameCounter: number

  /**
   * Creates an instance of the SafariView component.
   *
   * This constructor initializes the component and sets up the layout and
   * structure of the SafariView.
   */
  constructor() {
    super()

    const game = document.createElement('div')
    game.classList.add('game')

    game.appendChild(this.createMenuBar())

    const canvasContainer = document.createElement('div')
    canvasContainer.classList.add('canvasContainer')
    game.appendChild(canvasContainer)

    const canvas = document.createElement('canvas')
    canvas.style.backgroundColor = '#000000'
    canvas.addEventListener('click', this.handleGameAreaClick)
    canvasContainer.appendChild(canvas)
    this._renderContext = canvas.getContext('2d') as CanvasRenderingContext2D

    game.appendChild(this.createLabelsBar())
    this.appendChild(game)

    const mainMenuDialog = this.createMainMenuDialog()
    this.appendChild(mainMenuDialog)
    this.appendChild(this.createDifficultyDialog())
    this.appendChild(this.createTilesDialog())
    this.appendChild(this.createCarnivoresDialog())
    this.appendChild(this.createHerbivoresDialog())
    this.appendChild(this.createEntryFeeDialog())
    this.appendChild(this.createSpeedDialog())
    this.appendChild(this.createWinDialog())
    this.appendChild(this.createLoseDialog())
    this.appendChild(this.createHowToPlayDialog())

    requestAnimationFrame(this.resizeCanvas)
    window.addEventListener('resize', () => {
      canvas.height = 0
      this.resizeCanvas()
    })

    this._isPaused = true
    this._unit = 1
    this._labelTimer = 0
    this._frameCounter = 0
    window.addEventListener('keydown', this.handleKeyDown)
    mainMenuDialog.showModal()
    losingSignal.connect(this.onLose)
    goalMetSignal.connect(this.onGoalMet)
  }

  /**
   * Resizes the canvas to fit the container while maintaining the aspect ratio.
   */
  private resizeCanvas = () => {
    const canvasContainer = this.querySelector('.canvasContainer') as HTMLDivElement
    const canvas = this.querySelector('canvas') as HTMLCanvasElement
    const height = canvasContainer.offsetHeight

    if (this._gameModel) {
      this._unit = Math.floor(height / this._gameModel.height) || 1
      canvas.width = this._unit * this._gameModel.width
      canvas.height = this._unit * this._gameModel.height
    }
  }

  /**
   * Gets called repeatedly to update and render the game.
   * @param {DOMHighResTimeStamp} currentTime - The current time in milliseconds.
   * @param {DOMHighResTimeStamp} lastTime - The last time the game loop was called.
   */
  private gameLoop = (currentTime: DOMHighResTimeStamp, lastTime: DOMHighResTimeStamp = 0) => {
    if (!this._isPaused) {
      const deltaTime = (currentTime - lastTime) / 1000
      this.update(deltaTime)
      this.render()
      this.updateLabels(deltaTime)
    }
    requestAnimationFrame(newTime => this.gameLoop(newTime, currentTime))
  }

  /**
   * Updates the game state by one tick.
   *
   * @param dt - The time delta since the last update.
   */
  private update = (dt: number) => {
    this._gameModel?.tick(dt)
  }

  /**
   * Renders the game by drawing all the draw data on the canvas.
   */
  private render = () => {
    this._frameCounter++

    if (!this._gameModel)
      return

    this._renderContext.clearRect(0, 0, this._renderContext.canvas.width, this._renderContext.canvas.height)

    const drawDatas = this._gameModel.getAllDrawData()
    drawDatas.sort((a, b) => a.zIndex - b.zIndex)
    drawDatas.forEach(this.draw)
  }

  /**
   * Draws the object described by the given draw data on the canvas.
   *
   * @param data - The draw data describing the object to be drawn.
   */
  private draw = (data: DrawData) => {
    const image = loadImage(data.image)
    const [x, y] = data.getScreenPosition(this._unit)
    const size = data.getSize(this._unit)
    this._renderContext.drawImage(image, x, y, size, size)

    if (data instanceof SpriteDrawData) {
      if (data.isChipped) {
        const chipImage = loadImage('/resources/textures/chip.webp')
        const s = this._unit / 2
        this._renderContext.drawImage(
          chipImage,
          x + size - s / 2,
          y - s / 2,
          s,
          s,
        )
      }

      if (data.isSelected) {
        this._renderContext.strokeStyle = '#ffff00'
        this._renderContext.lineWidth = 3
        this._renderContext.strokeRect(x - 2, y - 2, size + 4, size + 4)
      }
    }
  }

  /**
   * Updates the labels to show the stats of the game.
   *
   * @param dt - The time delta since the last update.
   */
  private updateLabels = (dt: number) => {
    this._labelTimer += dt
    if (this._labelTimer < 1)
      return

    // const fpsLabel = this.querySelector('#fpsLabel')
    const balanceLabel = this.querySelector('#balanceLabel')
    const speedLabel = this.querySelector('#speedLabel')
    const jeepsLabel = this.querySelector('#jeepsLabel')
    const ratingLabel = this.querySelector('#ratingLabel')
    const goalsMetLabel = this.querySelector('#goalsMetLabel')
    const herbivoreLabel = this.querySelector('#herbivoreLabel')
    const carnivoreLabel = this.querySelector('#carnivoreLabel')
    const daysLabel = this.querySelector('#daysLabel')

    // if (fpsLabel)
    //   fpsLabel.textContent = `FPS: ${this._frameCounter}`

    if (this._gameModel) {
      if (balanceLabel)
        balanceLabel.textContent = `$${this._gameModel.balance}`
      if (jeepsLabel)
        jeepsLabel.textContent = `Jeeps ready: ${this._gameModel.waitingJeepCount}`
      if (ratingLabel)
        ratingLabel.textContent = `Rating: ${'★'.repeat(this._gameModel.rating)}${'☆'.repeat(5 - this._gameModel.rating)}`
      if (goalsMetLabel)
        goalsMetLabel.textContent = `${this._gameModel.daysGoalMet}/${this._gameModel.goal.forDays}`
      if (herbivoreLabel)
        herbivoreLabel.textContent = `Herbivores: ${this._gameModel.herbivoreCount}`
      if (carnivoreLabel)
        carnivoreLabel.textContent = `Carnivores: ${this._gameModel.carnivoreCount}`
      if (daysLabel)
        daysLabel.textContent = `Days: ${this._gameModel.daysPassed}`
      if (speedLabel) {
        switch (this._gameModel.speed) {
          case 1:
            speedLabel.textContent = `Speed: Hour`
            break
          case 24:
            speedLabel.textContent = `Speed: Day`
            break
          case 168:
            speedLabel.textContent = `Speed: Week`
            break
        }
      }
    }

    this._labelTimer = 0
    this._frameCounter = 0
  }

  private onLose = () => {
    this._isPaused = true
    const loseDialog = document.querySelector('#loseDialog') as HTMLDialogElement
    loseDialog.showModal()
  }

  private onGoalMet = () => {
    this._isPaused = true
    const winDialog = document.querySelector('#winDialog') as HTMLDialogElement
    winDialog.showModal()
  }

  /**
   * Handles the click event for the "New Game" button.
   */
  private clickNewGame = async (): Promise<void> => {
    const mainMenuDialog = document.querySelector('#mainMenuDialog') as HTMLDialogElement
    mainMenuDialog.close()

    const difficultyDialog = document.querySelector('#difficultyDialog') as HTMLDialogElement
    difficultyDialog.showModal()
  }

  private clickRestart = async () => {
    const winDialog = document.querySelector('#winDialog') as HTMLDialogElement
    winDialog?.close()
    const loseDialog = document.querySelector('#loseDialog') as HTMLDialogElement
    loseDialog?.close()
    const mainMenuDialog = document.querySelector('#mainMenuDialog') as HTMLDialogElement
    mainMenuDialog.showModal()
  }

  /**
   * Handles the click event for the difficulty buttons.
   *
   * It creates a new game model with the selected difficulty and starts the game loop.
   *
   * @param event - The click event.
   */
  private clickDifficulty = async (event: MouseEvent): Promise<void> => {
    const difficultyDialog = document.querySelector('#difficultyDialog') as HTMLDialogElement
    difficultyDialog.close()

    const target = event.target as HTMLElement
    const difficultyID = target.dataset.id

    this._gameModel = new SafariModel(difficultyID ?? 'safari:difficulty/normal')
    await this._gameModel.loadGame()
    this._isPaused = false

    requestAnimationFrame(time => this.gameLoop(time))
    this.resizeCanvas()
  }

  /**
   * Handles the click event for the "Exit" button.
   */
  private clickExitButton = async () => {
    await exit(0)
  }

  /**
   * Handles the click event for the "Tiles" button.
   */
  private clickTilesButton = () => {
    const tilesDialog = document.querySelector('#tilesDialog') as HTMLDialogElement
    tilesDialog.showModal()
  }

  /**
   * Handles the click event for the "Carnivores" button.
   */
  private clickCarnivoresButton = () => {
    const carnivoresDialog = document.querySelector('#carnivoresDialog') as HTMLDialogElement
    carnivoresDialog.showModal()
  }

  /**
   * Handles the click event for the "Herbivores" button.
   */
  private clickHerbivoresButton = () => {
    const herbivoresDialog = document.querySelector('#herbivoresDialog') as HTMLDialogElement
    herbivoresDialog.showModal()
  }

  /**
   * Handles the click event for the "Speed" button.
   */
  private clickSpeedButton = () => {
    const speedDialog = document.querySelector('#speedDialog') as HTMLDialogElement
    speedDialog.showModal()
  }

  /**
   * Handles the click event for any selectable button.
   *
   * @param event - The click event.
   */
  private clickSelectable = (
    event: MouseEvent,
    display: boolean = true,
  ): SafariButton => {
    const selectedLabelImage = document.querySelector('.selectedSpriteLabelImage') as HTMLImageElement

    const target = event.target as HTMLElement
    const selectedButton = target.closest('button') as SafariButton
    if (selectedButton.dataset.selected === 'true') {
      selectedButton.dataset.selected = 'false'
      selectedButton.reset()
      selectedLabelImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    }
    else {
      const oldSelected = document.querySelector('[data-selected="true"]') as SafariButton
      if (oldSelected) {
        oldSelected.dataset.selected = 'false'
        oldSelected.reset()
      }
      selectedButton.dataset.selected = 'true'
      selectedLabelImage.src = selectedButton.image || ''
    }

    if (!display)
      selectedLabelImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

    const dialogs = document.querySelectorAll('dialog')
    dialogs.forEach(dialog => dialog.close())

    return selectedButton
  }

  /**
   * Handles the click event for the speed buttons.
   *
   * @param speed - The speed value to set.
   */
  private clickSpeed = (speed: number) => {
    if (this._gameModel) {
      this._gameModel.speed = speed
    }
    const dialogs = document.querySelectorAll('dialog')
    dialogs.forEach(dialog => dialog.close())
  }

  /**
   * Handles the click event for the entry fee button.
   */
  private clickEntryFeeButton = () => {
    const entryFeeDialog = document.querySelector('#entryFeeDialog') as HTMLDialogElement
    const input = entryFeeDialog.querySelector('input') as HTMLInputElement
    input.value = `${this._gameModel?.entryFee}`
    entryFeeDialog.showModal()
  }

  /**
   * Handles the click event for the save entry fee button.
   */
  private clickSaveEntryFeeButton = () => {
    const entryFeeDialog = document.querySelector('#entryFeeDialog') as HTMLDialogElement
    const input = entryFeeDialog.querySelector('input') as HTMLInputElement
    if (this._gameModel)
      this._gameModel.entryFee = Number(input.value)
    entryFeeDialog.close()
  }

  private clickOpenCloseButton = () => {
    const openCloseButton = document.querySelector('#openCloseButton') as SafariButton
    if (this._gameModel) {
      this._gameModel.isOpen = !this._gameModel.isOpen
      openCloseButton.textContent = this._gameModel.isOpen ? 'Close' : 'Open'
      if (this._gameModel.isOpen)
        openCloseButton.color = '#ffab7e'
      else
        openCloseButton.reset()
    }
  }

  /**
   * Handles the click event on the game area.
   *
   * @param event - The click event.
   */
  private handleGameAreaClick = async (event: MouseEvent) => {
    const selected = document.querySelector('[data-selected="true"]') as SafariButton

    if (!selected) {
      const coords = calcCoords(event.offsetX, event.offsetY, this._unit)
      this._gameModel?.selectSpriteAt(...coords)
      return
    }

    const id = selected.dataset.id ?? ''
    const gridPos = calcGridPos(event.offsetX, event.offsetY, this._unit)
    const coords = calcCoords(event.offsetX, event.offsetY, this._unit)

    switch (selected.dataset.type) {
      case 'tile':
        await this._gameModel?.buyTile(id, ...gridPos)
        break
      case 'carnivore':
        await this._gameModel?.buyCarnivore(id, ...gridPos)
        break
      case 'herbivore':
        await this._gameModel?.buyHerbivore(id, ...gridPos)
        break
      case 'chip':
        this._gameModel?.chipAnimalAt(...coords)
        break
      case 'sell':
        this._gameModel?.sellAnimalAt(...coords)
        break
      case 'ranger':
        await this._gameModel?.buyRanger(...gridPos)
        break
    }
  }

  /**
   * Handles the keydown event to toggle the main menu dialog.
   *
   * @param {KeyboardEvent} event - The keydown event.
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    const mainMenuDialog = document.querySelector('#mainMenuDialog') as HTMLDialogElement
    if (event.key === 'Escape') {
      event.preventDefault()
      if (mainMenuDialog.open) {
        this._isPaused = false
        mainMenuDialog.close()
      }
      else {
        this._isPaused = true
        mainMenuDialog.showModal()
      }
    }
  }

  /**
   * Creates the main menu dialog for the SafariView component.
   *
   * @returns {HTMLDialogElement} The main menu dialog element.
   */
  private createMainMenuDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'mainMenuDialog'

    const container = document.createElement('div')
    container.classList.add('mainMenuDialog')

    const title = document.createElement('img')
    title.classList.add('logo')
    title.src = '/resources/brand/logo.webp'
    title.alt = 'Safari Manager Logo'

    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    const startButton = new SafariButton('#b8f38b', {
      text: 'New Game',
      title: 'New Game',
    })
    startButton.addEventListener('click', this.clickNewGame)
    buttonContainer.appendChild(startButton)

    const howToPlayButton = new SafariButton('#fff4a0', {
      text: 'How to Play',
      title: 'How to Play',
    })
    howToPlayButton.addEventListener('click', () => {
      const howToPlayDialog = document.querySelector('#howToPlayDialog') as HTMLDialogElement
      howToPlayDialog.showModal()
    })
    buttonContainer.appendChild(howToPlayButton)

    const exitButton = new SafariButton('#ffab7e', {
      text: 'Exit',
      title: 'Exit',
    })
    exitButton.addEventListener('click', this.clickExitButton)
    buttonContainer.appendChild(exitButton)

    dialog.appendChild(container)
    return dialog
  }

  private createHowToPlayDialog = () => {
    const dialog = document.createElement('dialog')
    dialog.id = 'howToPlayDialog'

    const container = document.createElement('div')
    container.classList.add('howToPlayDialog')

    const title = document.createElement('h1')
    title.textContent = 'How to Play'
    title.style.textAlign = 'center'
    container.appendChild(title)

    const paragraphContainer = document.createElement('div')
    paragraphContainer.classList.add('paragraphContainer')

    const p1 = document.createElement('p')
    const p2 = document.createElement('p')
    const p3 = document.createElement('p')
    p1.textContent = 'This is a game where you manage a safari park. You can buy tiles, animals, and set the entry fees. Your goal is to keep the animals happy and the park profitable.'
    p2.textContent = 'You lose if you run out of money and animals. You win if you meet the goals of the difficulty you selected.'
    p3.textContent = 'Beware of poachers as they can steal or kill your animals. Buy rangers to protect your park.'
    paragraphContainer.appendChild(p1)
    paragraphContainer.appendChild(p2)
    paragraphContainer.appendChild(p3)

    container.appendChild(paragraphContainer)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')

    const closeButton = new SafariButton('#fff4a0', {
      text: 'Close',
      title: 'Close',
    })
    closeButton.addEventListener('click', () => {
      dialog.close()
    })

    buttonContainer.appendChild(closeButton)
    container.appendChild(buttonContainer)
    dialog.appendChild(container)

    return dialog
  }

  private createWinDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'winDialog'

    const container = document.createElement('div')
    container.classList.add('winDialog')

    const title = document.createElement('h1')
    title.textContent = 'You Win!'
    title.style.textAlign = 'center'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    const restartButton = new SafariButton('#b8f38b', {
      text: 'Restart',
      title: 'Restart',
    })
    restartButton.addEventListener('click', this.clickRestart)
    buttonContainer.appendChild(restartButton)

    dialog.appendChild(container)
    return dialog
  }

  private createLoseDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'loseDialog'

    const container = document.createElement('div')
    container.classList.add('loseDialog')

    const title = document.createElement('h1')
    title.textContent = 'You Lose!'
    title.style.textAlign = 'center'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    const restartButton = new SafariButton('#b8f38b', {
      text: 'Restart',
      title: 'Restart',
    })
    restartButton.addEventListener('click', this.clickRestart)
    buttonContainer.appendChild(restartButton)

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the difficulty dialog for the SafariView component.
   * @returns {HTMLDialogElement} The difficulty dialog element.
   */
  private createDifficultyDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'difficultyDialog'

    const container = document.createElement('div')
    container.classList.add('mainMenuDialog')

    const title = document.createElement('img')
    title.classList.add('logo')
    title.src = '/resources/brand/logo.webp'
    title.alt = 'Safari Manager Logo'

    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    const easyButton = new SafariButton('#b8f38b', {
      title: 'Easy',
      text: 'Easy',
    })
    easyButton.dataset.id = 'safari:difficulty/easy'
    easyButton.addEventListener('click', this.clickDifficulty)
    buttonContainer.appendChild(easyButton)

    const normalButton = new SafariButton('#ffe449', {
      title: 'Normal',
      text: 'Normal',
    })
    normalButton.dataset.id = 'safari:difficulty/normal'
    normalButton.addEventListener('click', this.clickDifficulty)
    buttonContainer.appendChild(normalButton)

    const hardButton = new SafariButton('#ffab7e', {
      title: 'Hard',
      text: 'Hard',
    })
    hardButton.dataset.id = 'safari:difficulty/hard'
    hardButton.addEventListener('click', this.clickDifficulty)
    buttonContainer.appendChild(hardButton)

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the tiles dialog for the SafariView component.
   *
   * @returns {HTMLDialogElement} The tiles dialog element.
   */
  private createTilesDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'tilesDialog'

    const container = document.createElement('div')
    container.classList.add('selectDialog')

    const title = document.createElement('h1')
    title.textContent = 'Tiles'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    Array.from(tileRegistry.keys())
      .sort()
      .filter(t => t !== 'safari:entrance' && t !== 'safari:exit')
      .forEach(async (tileId) => {
        const tile = createTile(tileId)
        await tile?.load()
        const drawData = tile?.drawData

        let image = ''
        if (drawData) {
          await drawData?.loadJsonData()
          image = drawData?.image
        }

        const tileButton = new SafariButton('#fff4a000', { image, title: tileId })
        tileButton.dataset.selectable = 'true'
        tileButton.dataset.selected = 'false'
        tileButton.dataset.type = 'tile'
        tileButton.dataset.id = tileId
        tileButton.addEventListener('click', this.clickSelectable)
        buttonContainer.appendChild(tileButton)
      })

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the carnivores dialog for the SafariView component.
   * @returns {HTMLDialogElement} The carnivores dialog element.
   */
  private createCarnivoresDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'carnivoresDialog'

    const container = document.createElement('div')
    container.classList.add('selectDialog')

    const title = document.createElement('h1')
    title.textContent = 'Carnivores'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    Array.from(carnivoreRegistry.keys()).sort().forEach(async (animalId) => {
      const carnivore = createCarnivore(animalId)
      await carnivore?.load()
      const drawData = carnivore?.drawData

      let image = ''
      if (drawData) {
        await drawData?.loadJsonData()
        image = drawData?.image
      }

      const carnivoreButton = new SafariButton('#fff4a000', {
        image,
        title: animalId,
      })
      carnivoreButton.dataset.selectable = 'true'
      carnivoreButton.dataset.selected = 'false'
      carnivoreButton.dataset.type = 'carnivore'
      carnivoreButton.dataset.id = animalId
      carnivoreButton.addEventListener('click', this.clickSelectable)
      buttonContainer.appendChild(carnivoreButton)
    })

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the herbivores dialog for the SafariView component.
   * @returns {HTMLDialogElement} The herbivores dialog element.
   */
  private createHerbivoresDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'herbivoresDialog'

    const container = document.createElement('div')
    container.classList.add('selectDialog')

    const title = document.createElement('h1')
    title.textContent = 'Herbivores'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    Array.from(herbivoreRegistry.keys()).sort().forEach(async (animalId) => {
      const herbivore = createHerbivore(animalId)
      await herbivore?.load()
      const drawData = herbivore?.drawData

      let image = ''
      if (drawData) {
        await drawData?.loadJsonData()
        image = drawData?.image
      }

      const herbivoreButton = new SafariButton('#fff4a000', {
        image,
        title: animalId,
      })
      herbivoreButton.dataset.selectable = 'true'
      herbivoreButton.dataset.selected = 'false'
      herbivoreButton.dataset.type = 'herbivore'
      herbivoreButton.dataset.id = animalId
      herbivoreButton.addEventListener('click', this.clickSelectable)
      buttonContainer.appendChild(herbivoreButton)
    })

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the entry fee dialog for the SafariView component.
   *
   * @returns {HTMLDialogElement} The entry fee dialog element.
   */
  private createEntryFeeDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'entryFeeDialog'

    const container = document.createElement('div')
    container.classList.add('entryFeeDialog')

    const title = document.createElement('h1')
    title.textContent = 'Entry Fee'
    container.appendChild(title)

    const inputContainer = document.createElement('div')
    inputContainer.classList.add('buttonContainer')

    const input = document.createElement('input')
    input.type = 'number'
    input.min = '0'
    inputContainer.appendChild(input)

    const entryFeeButton = new SafariButton('#b8f38b', {
      text: 'Save',
      title: 'Save',
    })
    entryFeeButton.dataset.id = 'saveEntryFee'
    entryFeeButton.addEventListener('click', this.clickSaveEntryFeeButton)
    inputContainer.appendChild(entryFeeButton)

    container.appendChild(inputContainer)

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Creates the speed dialog for the SafariView component.
   *
   * @returns {HTMLDialogElement} The speed dialog element.
   */
  private createSpeedDialog = (): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = 'speedDialog'

    const container = document.createElement('div')
    container.classList.add('selectDialog')
    container.classList.add('speedDialog')

    const title = document.createElement('h1')
    title.textContent = 'Speed'
    container.appendChild(title)

    const buttonContainer = document.createElement('div')
    buttonContainer.classList.add('buttonContainer')
    container.appendChild(buttonContainer)

    const hourButton = new SafariButton('#cccccc', {
      text: 'Hour',
      title: 'Hour',
    })
    buttonContainer.appendChild(hourButton)
    hourButton.addEventListener('click', () => this.clickSpeed(1))

    const dayButton = new SafariButton('#cccccc', {
      text: 'Day',
      title: 'Day',
    })
    buttonContainer.appendChild(dayButton)
    dayButton.addEventListener('click', () => this.clickSpeed(24))

    const weekButton = new SafariButton('#cccccc', {
      text: 'Week',
      title: 'Week',
    })
    buttonContainer.appendChild(weekButton)
    weekButton.addEventListener('click', () => this.clickSpeed(168))

    dialog.appendChild(container)
    return dialog
  }

  /**
   * Handles the click event for the "Buy Jeep" button.
   */
  private clickBuyJeepButton = async () => {
    await this._gameModel?.buyJeep()
  }

  /**
   * Creates the menu bar for the SafariView component.
   *
   * @returns {HTMLDivElement} The menu bar element.
   */
  private createMenuBar = (): HTMLDivElement => {
    const menuBar = document.createElement('div')
    menuBar.classList.add('menuBar')

    const container = document.createElement('div')
    container.classList.add('container')

    const leftGroup = document.createElement('div')
    leftGroup.classList.add('group')

    const openCloseButton = new SafariButton('#c0ffca', {
      text: 'Open',
      title: 'Open/Close',
    })
    openCloseButton.id = 'openCloseButton'
    openCloseButton.addEventListener('click', this.clickOpenCloseButton)
    leftGroup.appendChild(openCloseButton)

    const placeables = document.createElement('div')
    placeables.classList.add('group')

    const tilesButton = new SafariButton('#fff4a0', {
      image: '/resources/icons/tile_icon.webp',
      title: 'Tiles',
    })
    tilesButton.style.padding = '0.5em 1em'
    placeables.appendChild(tilesButton)
    tilesButton.addEventListener('click', this.clickTilesButton)

    const carnivoresButton = new SafariButton('#ffab7e', {
      image: '/resources/icons/meat_icon.webp',
      title: 'Carnivores',
    })
    carnivoresButton.style.padding = '0.5em 1em'
    placeables.appendChild(carnivoresButton)
    carnivoresButton.addEventListener('click', this.clickCarnivoresButton)

    const herbivoresButton = new SafariButton('#e4ff6b', {
      image: '/resources/icons/herbivore_icon.webp',
      title: 'Herbivores',
    })
    placeables.appendChild(herbivoresButton)
    herbivoresButton.addEventListener('click', this.clickHerbivoresButton)

    leftGroup.appendChild(placeables)

    const buyables = document.createElement('div')
    buyables.classList.add('group')

    const buyJeepButton = new SafariButton('#b8f38b', {
      image: '/resources/icons/buy_jeep_icon.webp',
      title: 'Buy Jeep',
    })
    buyJeepButton.addEventListener('click', this.clickBuyJeepButton)
    buyables.appendChild(buyJeepButton)

    const chipButton = new SafariButton('#ffe449', {
      image: '/resources/icons/buy_chip_icon.webp',
      title: 'Buy Chip',
    })
    chipButton.dataset.type = 'chip'
    chipButton.addEventListener(
      'click',
      e => this.clickSelectable(e, false),
    )
    buyables.appendChild(chipButton)

    const buyRangerButton = new SafariButton('#ffab7e', {
      image: '/resources/icons/buy_ranger_icon.webp',
      title: 'Buy Ranger',
    })
    buyRangerButton.dataset.type = 'ranger'
    buyRangerButton.addEventListener(
      'click',
      e => this.clickSelectable(e, false),
    )
    buyables.appendChild(buyRangerButton)

    leftGroup.appendChild(buyables)

    const settables = document.createElement('div')
    settables.classList.add('group')

    const entryFeeButton = new SafariButton('#e2fc9b', {
      image: '/resources/icons/ticket_icon.webp',
      title: 'Entry Fee',
    })
    entryFeeButton.addEventListener('click', this.clickEntryFeeButton)
    settables.appendChild(entryFeeButton)

    const speedButton = new SafariButton('#97b8ff', {
      image: '/resources/icons/time_icon.webp',
      title: 'Speed',
    })
    settables.appendChild(speedButton)
    speedButton.addEventListener('click', this.clickSpeedButton)

    leftGroup.appendChild(settables)
    container.appendChild(leftGroup)

    const rightGroup = document.createElement('div')
    rightGroup.classList.add('group')

    const sellAnimalButton = new SafariButton('#b8f38b', {
      text: 'Sell',
      image: '/resources/icons/animal_icon.webp',
      title: 'Sell Animal',
    })
    sellAnimalButton.dataset.type = 'sell'
    sellAnimalButton.addEventListener(
      'click',
      e => this.clickSelectable(e, false),
    )
    rightGroup.appendChild(sellAnimalButton)

    const selectedSpriteLabel = document.createElement('div')
    selectedSpriteLabel.classList.add('group')

    const selectedSpriteLabelText = document.createElement('span')
    selectedSpriteLabelText.textContent = 'Selected:'
    selectedSpriteLabel.appendChild(selectedSpriteLabelText)

    const selectedSpriteLabelImage = document.createElement('img')
    selectedSpriteLabelImage.classList.add('selectedSpriteLabelImage')
    selectedSpriteLabel.appendChild(selectedSpriteLabelImage)

    rightGroup.appendChild(selectedSpriteLabel)
    container.appendChild(rightGroup)
    menuBar.appendChild(container)

    return menuBar
  }

  /**
   * Creates the labels bar for the SafariView component.
   *
   * @returns {HTMLDivElement} The labels bar element.
   */
  private createLabelsBar = (): HTMLDivElement => {
    const labelsBar = document.createElement('div')
    labelsBar.classList.add('menuBar', 'labels')

    const container = document.createElement('div')
    container.classList.add('container')

    // const fpsLabel = document.createElement('span')
    // fpsLabel.id = 'fpsLabel'
    // fpsLabel.textContent = 'FPS: 0'
    // container.appendChild(fpsLabel)

    const balanceLabel = document.createElement('span')
    balanceLabel.id = 'balanceLabel'
    balanceLabel.textContent = '$0'
    container.appendChild(balanceLabel)

    const jeepsLabel = document.createElement('span')
    jeepsLabel.id = 'jeepsLabel'
    jeepsLabel.textContent = 'Jeeps ready: 0'
    container.appendChild(jeepsLabel)

    const herbivoreLabel = document.createElement('span')
    herbivoreLabel.id = 'herbivoreLabel'
    herbivoreLabel.textContent = 'Herbivores: 0'
    container.appendChild(herbivoreLabel)

    const carnivoreLabel = document.createElement('span')
    carnivoreLabel.id = 'carnivoreLabel'
    carnivoreLabel.textContent = 'Carnivores: 0'
    container.appendChild(carnivoreLabel)

    const ratingLabel = document.createElement('span')
    ratingLabel.id = 'ratingLabel'
    ratingLabel.textContent = 'Rating: ★★★☆☆'
    container.appendChild(ratingLabel)

    const speedLabel = document.createElement('span')
    speedLabel.id = 'speedLabel'
    speedLabel.textContent = 'Speed: Hour'
    container.appendChild(speedLabel)

    const daysLabel = document.createElement('span')
    daysLabel.id = 'daysLabel'
    daysLabel.textContent = 'Days: 0'
    container.appendChild(daysLabel)

    const goalsMetLabel = document.createElement('span')
    goalsMetLabel.id = 'goalsMetLabel'
    goalsMetLabel.textContent = '0/0'
    container.appendChild(goalsMetLabel)

    labelsBar.appendChild(container)

    return labelsBar
  }
}
