import { describe, it, expect } from 'vitest'
import { isVideoStoreResource } from '../videoStoreUtils'

const resource = (overrides: Partial<{ type: string; subtype: string; name: string }> = {}) => ({
  type: 'component',
  subtype: 'generic',
  name: 'my-video-store',
  ...overrides,
})

describe('isVideoStoreResource', () => {
  it('includes generic components', () => {
    expect(isVideoStoreResource(resource())).toBe(true)
  })

  it('includes rdk:service:video resources', () => {
    expect(
      isVideoStoreResource(resource({ type: 'service', subtype: 'video' }))
    ).toBe(true)
  })

  it('excludes the webapp generic component', () => {
    expect(isVideoStoreResource(resource({ name: 'webapp' }))).toBe(false)
  })

  it('excludes other services like vision', () => {
    expect(
      isVideoStoreResource(resource({ type: 'service', subtype: 'vision' }))
    ).toBe(false)
  })

  it('excludes non-generic components like cameras', () => {
    expect(
      isVideoStoreResource(resource({ type: 'component', subtype: 'camera' }))
    ).toBe(false)
  })
})
