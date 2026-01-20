import * as VIAM from '@viamrobotics/sdk'
import { Timestamp } from '@viamrobotics/sdk'
import { BinaryDataFile } from './BinaryDataFile'

interface FileQueryParams {
  machineId: string
  viamClient: VIAM.ViamClient
  passId: string
  start: Date
  end: Date
  onQuery: (
    passId: string,
    nextData: BinaryDataFile[],
    nextVideos: BinaryDataFile[],
    nextImages: BinaryDataFile[]
  ) => void
}

export class FileQueryManager {
  private _queries: Map<string, Promise<void>> = new Map()
  private _paginationTokens: Map<string, string> = new Map()

  public async queryFiles(params: FileQueryParams) {
    const existingQuery = this._queries.get(params.passId)
    if (existingQuery) {
      return existingQuery
    }

    const queryPromise = this.makeQuery(params)
    this._queries.set(params.passId, queryPromise)

    try {
      await queryPromise
    } finally {
      this._queries.delete(params.passId)
    }
  }

  private async makeQuery({
    machineId,
    viamClient,
    passId,
    start,
    end,
    onQuery,
  }: FileQueryParams) {
    const filter = new VIAM.dataApi.Filter({
      robotId: machineId,
      interval: new VIAM.dataApi.CaptureInterval({
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
      }),
    })

    const paginationToken = this._paginationTokens.get(passId)

    const binaryData = await viamClient.dataClient.binaryDataByFilter(
      filter,
      1000,
      VIAM.dataApi.Order.DESCENDING,
      paginationToken,
      false,
      false,
      false
    )

    const nextData: BinaryDataFile[] = []
    const nextVideos: BinaryDataFile[] = []
    const nextImages: BinaryDataFile[] = []

    binaryData.data.forEach((file) => {
      if (file.metadata?.binaryDataId) {
        const isVideo = file.metadata.fileName?.toLowerCase().includes('.mp4')
        const isImageFile = file.metadata.fileName
          ?.toLowerCase()
          .match(/\.(png|jpg|jpeg)$/)
        const isCameraCapture =
          file.metadata.captureMetadata?.componentName &&
          file.metadata.captureMetadata?.methodName

        if (isVideo) {
          nextVideos.push(new BinaryDataFile(file))
        } else if (isImageFile || isCameraCapture) {
          nextImages.push(new BinaryDataFile(file))
        } else {
          nextData.push(new BinaryDataFile(file))
        }
      }
    })

    onQuery(passId, nextData, nextVideos, nextImages)

    // Break if no more data to fetch
    if (!binaryData.last) {
      this._paginationTokens.delete(passId)
      return
    }

    this._paginationTokens.set(passId, binaryData.last)
    await this.makeQuery({
      machineId,
      viamClient,
      passId,
      start,
      end,
      onQuery,
    })
  }
}
