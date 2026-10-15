import * as VIAM from '@viamrobotics/sdk'

export class BinaryDataFile {
  private _binaryData: VIAM.dataApi.BinaryData

  constructor(binaryData: VIAM.dataApi.BinaryData) {
    this._binaryData = binaryData
  }

  get binaryDataId(): string {
    return this._binaryData.metadata?.binaryDataId || ''
  }

  get binaryData(): VIAM.dataApi.BinaryData {
    return this._binaryData
  }

  get captureMetadata(): VIAM.dataApi.CaptureMetadata | undefined {
    return this._binaryData.metadata?.captureMetadata
  }

  get datasetIds(): string[] {
    return this._binaryData.metadata?.datasetIds || []
  }

  get fileExtension(): string {
    return this._binaryData.metadata?.fileExt || ''
  }

  get fileName(): string {
    return this._binaryData.metadata?.fileName || ''
  }

  get timeRequested(): Date | undefined {
    return this._binaryData.metadata?.timeRequested?.toDate()
  }

  get timeReceived(): Date | undefined {
    return this._binaryData.metadata?.timeReceived?.toDate()
  }

  get uri(): string {
    return this._binaryData.metadata?.uri || ''
  }

  /**
   * Get the sync delay in milliseconds between when data was captured and when it was received.
   * Returns undefined if either timestamp is missing.
   */
  getSyncDelayMs(): number | undefined {
    const requested = this.timeRequested
    const received = this.timeReceived
    if (!requested || !received) return undefined
    return received.getTime() - requested.getTime()
  }

  public async getFileBinaryData(
    viamClient: VIAM.ViamClient
  ): Promise<VIAM.dataApi.BinaryData | undefined> {
    const data = await viamClient.dataClient.binaryDataByIds([
      this.binaryDataId,
    ])
    if (data.length === 0) {
      return undefined
    }
    return data[0]
  }

  public isPartOfPass(passId: string): boolean {
    return this.fileName.includes(passId)
  }

  public compareTo(other: BinaryDataFile): number {
    return this.timeRequested!.getTime() - other.timeRequested!.getTime()
  }
}
