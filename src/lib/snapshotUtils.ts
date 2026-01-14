import * as VIAM from '@viamrobotics/sdk'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'

export const getSnapshotFromGzipBinaryData = async (
  binaryData: VIAM.dataApi.BinaryData
): Promise<SnapshotProto> => {
  const json = binaryData.toJson() as unknown as { binary: string }
  const binaryStr = json.binary
  const binary = Uint8Array.from(atob(binaryStr), (c) => c.charCodeAt(0))
  const decompressor = new DecompressionStream('gzip')
  const blob = new Blob([binary])
  const stream = blob.stream().pipeThrough(decompressor)
  const response = await new Response(stream).blob()
  const buffer = await response.arrayBuffer()
  return SnapshotProto.fromBinary(new Uint8Array(buffer))
}
