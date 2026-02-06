import * as VIAM from '@viamrobotics/sdk'

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
}

/** Parses _YYYY-MM-DD_HH-mm-ss_ pattern */
const parseIsoTimestamp = (fileName: string): Date | null => {
  const match = fileName.match(/_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_/)
  if (!match) return null

  const date = new Date(`${match[1]}T${match[2].replace(/-/g, ':')}`)
  return isNaN(date.getTime()) ? null : date
}

/** Parses Month_DD_YYYY_HH_mm_ss_ pattern (e.g., January_23_2026_11_06_46_) */
const parseMonthNameTimestamp = (fileName: string): Date | null => {
  const match = fileName.match(
    /([A-Z][a-z]+)_(\d{1,2})_(\d{4})_(\d{1,2})_(\d{2})_(\d{2})_/
  )
  if (!match) return null

  const [, month, day, year, hour, minute, second] = match
  const monthIndex = MONTH_NAME_TO_INDEX[month]
  if (monthIndex === undefined) return null

  const date = new Date(
    parseInt(year),
    monthIndex,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
  return isNaN(date.getTime()) ? null : date
}

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

  public isInTimeRange(start: Date, end: Date): boolean {
    const fileTimestamp = this.getFileTimestamp()
    const timeRequested = fileTimestamp || this.timeRequested
    if (!timeRequested) return false
    return timeRequested >= start && timeRequested <= end
  }

  public isPartOfPass(passId: string): boolean {
    return this.fileName.includes(passId)
  }

  public getFileTimestamp = (): Date | null => {
    return (
      parseIsoTimestamp(this.fileName) ?? parseMonthNameTimestamp(this.fileName)
    )
  }

  public compareTo(other: BinaryDataFile): number {
    return this.timeRequested!.getTime() - other.timeRequested!.getTime()
  }
}
