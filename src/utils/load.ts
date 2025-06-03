const jsonCache: Map<string, any> = new Map()
const imageCache: Map<string, HTMLImageElement> = new Map()

/**
 * Loads a JSON file from the specified path and caches it for future use.
 *
 * If the loaded JSON file contains a `default` key, it will recursively merge in
 * default values from another JSON file, preserving any existing keys in the original.
 *
 * @param fileName - The name of the JSON file to load (without the .json extension).
 * @returns A promise that resolves to the loaded JSON data.
 *
 * @throws Will throw an error if the fetch request fails.
 */
export async function loadJson(fileName: string): Promise<any> {
  if (jsonCache.has(fileName))
    return jsonCache.get(fileName)

  const response = await fetch(`/${fileName}.json`)

  if (!response.ok)
    throw new Error(`Failed to load JSON file: ${fileName}`)

  const jsonData = await response.json()
  const defaultJson = jsonData.default

  if (defaultJson) {
    const defaultJsonData = await loadJson(`${fileName.split('/')[0]}/${defaultJson}.default`)

    for (const key in defaultJsonData) {
      if (key in jsonData)
        continue
      jsonData[key] = defaultJsonData[key]
    }

    delete jsonData.default
  }

  jsonCache.set(fileName, jsonData)

  return jsonData
}

/**
 * Clears the JSON cache.
 */
export function clearJsonCache() {
  jsonCache.clear()
}

/**
 * Loads an image from the specified path and caches it for future use.
 *
 * @param fileName - The name of the image file to load (without the file extension).
 * @returns The loaded HTMLImageElement.
 */
export function loadImage(fileName: string): HTMLImageElement {
  if (imageCache.has(fileName))
    return imageCache.get(fileName) ?? new Image()

  const image = new Image()
  image.src = fileName
  imageCache.set(fileName, image)

  return image
}
