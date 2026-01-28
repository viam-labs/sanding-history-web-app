import * as VIAM from '@viamrobotics/sdk'
import { BinaryDataFile } from './BinaryDataFile'

export type FileQueryCallback = (files: BinaryDataFile[]) => void

const BINARY_DATA_BATCH_SIZE = 1500

const IMAGES_PASS_END_TIME_BUFFER_MS = 60 * 60 * 1000
const PASS_END_TIME_BUFFER_MS = 60 * 60 * 1000 * 3

interface FileQueryParams {
  organizationId: string
  locationId: string
  machineId: string
  partId: string
  passId: string
  viamClient: VIAM.ViamClient
  passStart: Date
  passEnd: Date
  onQuery: FileQueryCallback
  signal?: AbortSignal
}
interface VideoQueryParams extends FileQueryParams {
  forceRefresh?: boolean
}

export class FileQueryManager {
  private _queries: Map<string, Promise<void>> = new Map()
  private _paginationTokens: Map<string, string> = new Map()

  private _loadedPassFiles: Set<string> = new Set()
  private _loadedImages: Set<string> = new Set()
  private _loadedVideos = false

  private _videoNames: Set<string> = new Set()
  private _videoFiles: BinaryDataFile[] = []
  private _imageFiles: Map<string, BinaryDataFile[]> = new Map()
  private _passFiles: Map<string, BinaryDataFile[]> = new Map()

  public async queryVideos(params: VideoQueryParams) {
    if (params.forceRefresh) {
      this._paginationTokens.delete(`videos-${params.machineId}`)
      this._loadedVideos = false
    } else if (this._loadedVideos) {
      const videos = this._videoFiles.filter((file) =>
        file.isPartOfPass(params.passId)
      )
      return params.onQuery(videos)
    }

    const queryKey = `videos-${params.machineId}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery && !params.forceRefresh) {
      await existingQuery
      const videos = this._videoFiles.filter((file) =>
        file.isPartOfPass(params.passId)
      )
      return params.onQuery(videos)
    }

    const queryPromise = this.makeVideoQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      this._loadedVideos = true
      const videos = this._videoFiles.filter((file) =>
        file.isPartOfPass(params.passId)
      )
      return params.onQuery(videos)
    } finally {
      this._queries.delete(queryKey)
    }
  }

  public async queryImages(params: FileQueryParams) {
    if (params.signal?.aborted) return

    const cacheKey = params.passId

    if (this._loadedImages.has(cacheKey)) {
      const cached = this._imageFiles.get(cacheKey) || []
      return params.onQuery(cached)
    }

    const queryKey = `images-${cacheKey}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery) {
      await existingQuery
      if (params.signal?.aborted) return
      const cached = this._imageFiles.get(cacheKey) || []
      return params.onQuery(cached)
    }

    const queryPromise = this.makeImagesQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      if (!params.signal?.aborted) {
        this._loadedImages.add(cacheKey)
        const images = this._imageFiles.get(cacheKey) || []
        return params.onQuery(images)
      }
    } finally {
      this._queries.delete(queryKey)
    }
  }

  public async queryPassFiles(params: FileQueryParams): Promise<void> {
    if (params.signal?.aborted) return

    if (this._loadedPassFiles.has(params.passId)) {
      const cachedFiles = this._passFiles.get(params.passId)
      if (cachedFiles) {
        params.onQuery(cachedFiles)
        return
      }
    }

    const queryKey = `allfiles-${params.passId}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery) {
      await existingQuery
      if (params.signal?.aborted) return
      const cachedFiles = this._passFiles.get(params.passId)
      if (cachedFiles) params.onQuery(cachedFiles)
      return
    }

    const queryPromise = this.makePassFilesQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      if (!params.signal?.aborted) {
        this._loadedPassFiles.add(params.passId)
      }
    } finally {
      this._queries.delete(queryKey)
    }
  }

  private async makeVideoQuery(params: VideoQueryParams): Promise<void> {
    const { organizationId, locationId, machineId, partId, viamClient } = params
    const paginationKey = `videos-${machineId}`
    const paginationToken = this._paginationTokens.get(paginationKey)
    const filter = new VIAM.dataApi.Filter({
      organizationIds: [organizationId],
      locationIds: [locationId],
      robotId: machineId,
      partId: partId,
      mimeType: ['video/mp4'],
    })

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      BINARY_DATA_BATCH_SIZE,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    for (const file of binaryData.data) {
      if (!file.metadata?.binaryDataId) continue

      const video = new BinaryDataFile(file)
      if (this._videoNames.has(video.fileName)) continue

      this._videoNames.add(video.fileName)
      this._videoFiles.push(video)
    }

    const hasMorePages = !!binaryData.last
    console.log(
      `Fetched video batch: ${binaryData.data.length} in batch, ${hasMorePages ? 'more pages available' : 'no more pages'}`
    )

    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makeVideoQuery(params)
  }

  private async makeImagesQuery(params: FileQueryParams): Promise<void> {
    const {
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient,
      passId,
      passStart,
      passEnd,
      onQuery,
      signal,
    } = params

    if (signal?.aborted) return

    const cacheKey = passId
    const paginationKey = `images-${passId}`
    const paginationToken = this._paginationTokens.get(paginationKey)

    // Add buffer to end time to account for sync delays
    const bufferedEndTime = new Date(
      passEnd.getTime() + IMAGES_PASS_END_TIME_BUFFER_MS
    )

    const filter = new VIAM.dataApi.Filter({
      organizationIds: [organizationId],
      locationIds: [locationId],
      robotId: machineId,
      partId: partId,
      mimeType: ['image/png', 'image/jpeg'],
      interval: new VIAM.dataApi.CaptureInterval({
        start: VIAM.Timestamp.fromDate(passStart),
        end: VIAM.Timestamp.fromDate(bufferedEndTime),
      }),
    })

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      BINARY_DATA_BATCH_SIZE,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    if (signal?.aborted) return

    const nextImages: BinaryDataFile[] = []

    for (const file of binaryData.data) {
      if (!file.metadata?.binaryDataId) continue
      nextImages.push(new BinaryDataFile(file))
    }

    const existing = this._imageFiles.get(cacheKey) || []
    const existingIds = new Set(existing.map((f) => f.binaryDataId))
    const newImages = []
    for (const file of nextImages) {
      if (existingIds.has(file.binaryDataId)) continue
      if (!file.isPartOfPass(passId)) continue
      newImages.push(file)
    }

    this._imageFiles.set(cacheKey, [...existing, ...newImages])

    const hasMorePages = !!binaryData.last
    console.log(
      `Fetched images batch for pass ${passId}: ${binaryData.data.length} in batch, ${newImages.length} new, ${hasMorePages ? 'more pages available' : 'no more pages'}`
    )

    if (newImages.length > 0 && !signal?.aborted) onQuery(newImages)
    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    if (signal?.aborted) return

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makeImagesQuery(params)
  }

  private async makePassFilesQuery(params: FileQueryParams): Promise<void> {
    const {
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient,
      passId,
      passStart,
      passEnd,
      onQuery,
      signal,
    } = params

    if (signal?.aborted) return

    const paginationKey = `allfiles-${passId}`
    const paginationToken = this._paginationTokens.get(paginationKey)

    // Add buffer to end time to account for sync delays
    const bufferedEndTime = new Date(
      passEnd.getTime() + PASS_END_TIME_BUFFER_MS
    )

    const filter = new VIAM.dataApi.Filter({
      organizationIds: [organizationId],
      locationIds: [locationId],
      robotId: machineId,
      partId: partId,
      interval: new VIAM.dataApi.CaptureInterval({
        start: VIAM.Timestamp.fromDate(passStart),
        end: VIAM.Timestamp.fromDate(bufferedEndTime),
      }),
    })

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      BINARY_DATA_BATCH_SIZE,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    if (signal?.aborted) return

    const nextFiles: BinaryDataFile[] = []
    for (const file of binaryData.data) {
      if (!file.metadata?.binaryDataId) continue
      nextFiles.push(new BinaryDataFile(file))
    }

    const existingFiles = this._passFiles.get(passId) || []
    const existingIds = new Set(existingFiles.map((f) => f.binaryDataId))
    const newFiles = []
    for (const file of nextFiles) {
      if (existingIds.has(file.binaryDataId)) continue
      if (!file.isPartOfPass(passId)) continue
      newFiles.push(file)
    }

    this._passFiles.set(passId, [...existingFiles, ...newFiles])

    const hasMorePages = !!binaryData.last
    console.log(
      `Fetched files batch for pass ${passId}: ${binaryData.data.length} in batch, ${newFiles.length} new, ${hasMorePages ? 'more pages available' : 'no more pages'}`
    )

    if (newFiles.length > 0 && !signal?.aborted) onQuery(newFiles)
    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    if (signal?.aborted) return

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makePassFilesQuery(params)
  }
}
