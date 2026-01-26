import * as VIAM from '@viamrobotics/sdk'
import { BinaryDataFile } from './BinaryDataFile'
import { getVideoTimestamp } from './videoUtils'

export type FileQueryCallback = (files: BinaryDataFile[]) => void

interface FileQueryParams {
  machineId: string
  viamClient: VIAM.ViamClient
  passId: string
  start: Date
  end: Date
  forceRefresh?: boolean
  onQuery: FileQueryCallback
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

  public async queryVideos(params: FileQueryParams): Promise<BinaryDataFile[]> {
    if (params.forceRefresh) {
      this._paginationTokens.delete(`videos-${params.machineId}`)
      this._loadedVideos = false
    } else if (this._loadedVideos) {
      const videos = this.getVideosForPass(params.start, params.end)
      params.onQuery(videos)
      return videos
    }

    const queryKey = `videos-${params.machineId}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery && !params.forceRefresh) {
      await existingQuery
      const videos = this.getVideosForPass(params.start, params.end)
      params.onQuery(videos)
      return videos
    }

    const queryPromise = this.makeVideoQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      this._loadedVideos = true
      const videos = this.getVideosForPass(params.start, params.end)
      params.onQuery(videos)
      return videos
    } finally {
      this._queries.delete(queryKey)
    }
  }

  public async queryImages(params: FileQueryParams): Promise<BinaryDataFile[]> {
    const cacheKey = params.passId

    if (!params.forceRefresh && this._loadedImages.has(cacheKey)) {
      const cached = this._imageFiles.get(cacheKey) || []
      params.onQuery(cached)
      return cached
    }

    const queryKey = `images-${cacheKey}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery && !params.forceRefresh) {
      await existingQuery
      const cached = this._imageFiles.get(cacheKey) || []
      params.onQuery(cached)
      return cached
    }

    const queryPromise = this.makeImagesQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      this._loadedImages.add(cacheKey)
      const images = this._imageFiles.get(cacheKey) || []
      return images
    } finally {
      this._queries.delete(queryKey)
    }
  }

  public async queryPassFiles(params: FileQueryParams): Promise<void> {
    if (!params.forceRefresh && this._loadedPassFiles.has(params.passId)) {
      const cachedFiles = this._passFiles.get(params.passId)
      if (cachedFiles) {
        params.onQuery(cachedFiles)
        return
      }
    }

    const queryKey = `allfiles-${params.passId}`
    const existingQuery = this._queries.get(queryKey)
    if (existingQuery && !params.forceRefresh) {
      await existingQuery
      const cachedFiles = this._passFiles.get(params.passId)
      if (cachedFiles) {
        params.onQuery(cachedFiles)
      }
      return
    }

    const queryPromise = this.makePassFilesQuery(params)
    this._queries.set(queryKey, queryPromise)

    try {
      await queryPromise
      this._loadedPassFiles.add(params.passId)
    } finally {
      this._queries.delete(queryKey)
    }
  }

  private getVideosForPass(start: Date, end: Date): BinaryDataFile[] {
    const videos: BinaryDataFile[] = []
    this._videoFiles.forEach((file) => {
      const videoTime = getVideoTimestamp(file.fileName)
      if (videoTime && videoTime >= start && videoTime <= end) {
        videos.push(file)
      }
    })

    return videos
  }

  private async makeVideoQuery(params: FileQueryParams): Promise<void> {
    const paginationKey = `videos-${params.machineId}`
    const paginationToken = this._paginationTokens.get(paginationKey)
    const filter = new VIAM.dataApi.Filter({
      robotId: params.machineId,
      mimeType: ['video/mp4'],
    })

    const binaryData = await params.viamClient.dataClient.binaryDataByFilter(
      filter,
      1000,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    binaryData.data.forEach((file) => {
      if (file.metadata?.binaryDataId) {
        const video = new BinaryDataFile(file)
        if (this._videoNames.has(video.fileName)) {
          return
        }

        this._videoNames.add(video.fileName)
        this._videoFiles.push(video)
      }
    })

    // Break if no more data to fetch
    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makeVideoQuery(params)
  }

  private async makeImagesQuery(params: FileQueryParams): Promise<void> {
    const { machineId, viamClient, passId, onQuery } = params
    const cacheKey = passId
    const paginationKey = `images-${passId}`
    const paginationToken = this._paginationTokens.get(paginationKey)
    const filter = new VIAM.dataApi.Filter({
      robotId: machineId,
      mimeType: ['image/png', 'image/jpeg'],
      interval: new VIAM.dataApi.CaptureInterval({
        start: VIAM.Timestamp.fromDate(params.start),
        end: VIAM.Timestamp.fromDate(params.end),
      }),
    })

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      1000,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    const nextImages: BinaryDataFile[] = []

    binaryData.data.forEach((file) => {
      if (file.metadata?.binaryDataId) {
        nextImages.push(new BinaryDataFile(file))
      }
    })

    const existing = this._imageFiles.get(cacheKey) || []
    const existingIds = new Set(existing.map((f) => f.binaryDataId))
    const newImages = nextImages.filter((f) => !existingIds.has(f.binaryDataId))
    this._imageFiles.set(cacheKey, [...existing, ...newImages])

    if (newImages.length > 0) onQuery(newImages)
    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makeImagesQuery(params)
  }

  private async makePassFilesQuery(params: FileQueryParams): Promise<void> {
    const { machineId, viamClient, passId, onQuery } = params
    const paginationKey = `allfiles-${passId}`
    const paginationToken = this._paginationTokens.get(paginationKey)
    const filter = new VIAM.dataApi.Filter({
      robotId: machineId,
      interval: new VIAM.dataApi.CaptureInterval({
        start: VIAM.Timestamp.fromDate(params.start),
        end: VIAM.Timestamp.fromDate(params.end),
      }),
    })

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      1000,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    const nextFiles: BinaryDataFile[] = []
    for (const file of binaryData.data) {
      if (file.metadata?.binaryDataId) {
        nextFiles.push(new BinaryDataFile(file))
      }
    }

    const existingFiles = this._passFiles.get(passId) || []
    const existingIds = new Set(existingFiles.map((f) => f.binaryDataId))
    const newFiles = nextFiles.filter((f) => !existingIds.has(f.binaryDataId))
    this._passFiles.set(passId, [...existingFiles, ...newFiles])

    if (newFiles.length > 0) onQuery(newFiles)
    if (!binaryData.last) {
      this._paginationTokens.delete(paginationKey)
      return
    }

    this._paginationTokens.set(paginationKey, binaryData.last)
    await this.makePassFilesQuery(params)
  }
}
