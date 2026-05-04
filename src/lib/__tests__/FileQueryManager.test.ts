import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileQueryManager } from '../FileQueryManager'
import * as VIAM from '@viamrobotics/sdk'

const makeBinaryData = (id: string, fileName: string) => ({
  metadata: {
    binaryDataId: id,
    fileName,
  },
  binary: new Uint8Array(),
})

const makeParams = (
  overrides: Partial<{
    passId: string
    onQuery: (files: any[]) => void
    signal: AbortSignal
    binaryDataByFilter: ReturnType<typeof vi.fn>
  }> = {}
) => {
  const binaryDataByFilter =
    overrides.binaryDataByFilter ??
    vi.fn().mockResolvedValue({ data: [], count: 0n, last: '' })
  return {
    params: {
      organizationId: 'org-1',
      locationId: 'loc-1',
      machineId: 'machine-1',
      partId: 'part-1',
      passId: overrides.passId ?? 'pass-1',
      viamClient: {
        dataClient: { binaryDataByFilter },
      } as unknown as VIAM.ViamClient,
      passStart: new Date('2024-01-01T00:00:00Z'),
      passEnd: new Date('2024-01-01T01:00:00Z'),
      onQuery: overrides.onQuery ?? vi.fn(),
      signal: overrides.signal,
    },
    binaryDataByFilter,
  }
}

describe('FileQueryManager.queryImages', () => {
  let manager: FileQueryManager

  beforeEach(() => {
    manager = new FileQueryManager()
  })

  it('uses tags filter with passId instead of time interval', async () => {
    const binaryDataByFilter = vi.fn().mockResolvedValue({
      data: [makeBinaryData('img-1', 'image_pass-1_2024-01-01.png')],
      count: 1n,
      last: '',
    })
    const onQuery = vi.fn()
    const { params } = makeParams({
      passId: 'pass-abc',
      onQuery,
      binaryDataByFilter,
    })

    await manager.queryImages(params)

    expect(binaryDataByFilter).toHaveBeenCalledOnce()
    const filter = binaryDataByFilter.mock.calls[0][0]
    // Should use tags filter with passId
    expect(filter.tagsFilter).toBeDefined()
    expect(filter.tagsFilter.tags).toContain('pass-abc')
    // Should NOT use time interval
    expect(filter.interval).toBeUndefined()
    // Should filter for image mime types
    expect(filter.mimeType).toEqual(['image/png', 'image/jpeg'])
  })

  it('calls onQuery with fetched images', async () => {
    const binaryDataByFilter = vi.fn().mockResolvedValue({
      data: [
        makeBinaryData('img-1', 'image1.png'),
        makeBinaryData('img-2', 'image2.jpeg'),
      ],
      count: 2n,
      last: '',
    })
    const onQuery = vi.fn()
    const { params } = makeParams({ onQuery, binaryDataByFilter })

    await manager.queryImages(params)

    // onQuery is called twice: once from makeImagesQuery (with new images), once from queryImages (with all images)
    expect(onQuery).toHaveBeenCalled()
    // The final call from queryImages should have all images
    const lastCall = onQuery.mock.calls[onQuery.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(2)
  })

  it('returns cached images on subsequent calls', async () => {
    const binaryDataByFilter = vi.fn().mockResolvedValue({
      data: [makeBinaryData('img-1', 'image1.png')],
      count: 1n,
      last: '',
    })
    const onQuery = vi.fn()
    const { params } = makeParams({ onQuery, binaryDataByFilter })

    await manager.queryImages(params)
    await manager.queryImages(params)

    // binaryDataByFilter should only be called once (cached on second call)
    expect(binaryDataByFilter).toHaveBeenCalledOnce()
  })

  it('does not query when signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const binaryDataByFilter = vi.fn()
    const onQuery = vi.fn()
    const { params } = makeParams({
      onQuery,
      binaryDataByFilter,
      signal: controller.signal,
    })

    await manager.queryImages(params)

    expect(binaryDataByFilter).not.toHaveBeenCalled()
    expect(onQuery).not.toHaveBeenCalled()
  })

  it('deduplicates images across paginated batches', async () => {
    let callCount = 0
    const binaryDataByFilter = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          data: [makeBinaryData('img-1', 'image1.png')],
          count: 1n,
          last: 'page-2-token',
        })
      }
      return Promise.resolve({
        data: [
          makeBinaryData('img-1', 'image1.png'), // duplicate
          makeBinaryData('img-2', 'image2.png'),
        ],
        count: 2n,
        last: '',
      })
    })
    const onQuery = vi.fn()
    const { params } = makeParams({ onQuery, binaryDataByFilter })

    await manager.queryImages(params)

    // The final call from queryImages should have deduplicated images
    const lastCall = onQuery.mock.calls[onQuery.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(2)
  })
})
