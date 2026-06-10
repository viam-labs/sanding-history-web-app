/**
 * Resource shape returned by `robotClient.resourceNames()` that we care about
 * when deciding whether a resource can act as a video store.
 */
interface VideoStoreCandidate {
  type: string
  subtype: string
  name: string
}

/**
 * Returns true if a robot resource should appear in the video store dropdown.
 *
 * Two kinds of resources qualify:
 *  - Generic components (`rdk:component:generic`), excluding this app's own
 *    `webapp` generic component.
 *  - Video services (`rdk:service:video`).
 */
export function isVideoStoreResource(resource: VideoStoreCandidate): boolean {
  const isGenericComponent =
    resource.type === 'component' &&
    resource.subtype === 'generic' &&
    resource.name !== 'webapp'

  const isVideoService =
    resource.type === 'service' && resource.subtype === 'video'

  return isGenericComponent || isVideoService
}
