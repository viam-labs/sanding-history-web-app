import { Step } from './types'
import { getVideoStoreName } from './videoUtils'
import { BinaryDataFile } from './BinaryDataFile'

// Polling configuration
const POLL_INTERVAL_MS = 10000 // 10 seconds between polls
const MAX_POLLING_TIME_MS = 300000 // 5 minutes timeout

// Global polling state to handle multiple concurrent requests
interface PollingRequest {
  videoStoreName: string
  requestId: string
  passId: string
  stepName: string
  startTime: number
  onComplete: () => void
  onTimeout: () => void
  last30s?: boolean
}

export class VideoPollingManager {
  private static instance: VideoPollingManager
  private activeRequests: Map<string, PollingRequest> = new Map()
  private isPolling: boolean = false
  private pollTimeout: number | null = null
  private passFetchers: Map<string, () => Promise<BinaryDataFile[]>> = new Map()
  private videosByPass: Map<string, BinaryDataFile[]> = new Map()

  static getInstance(): VideoPollingManager {
    if (!VideoPollingManager.instance) {
      VideoPollingManager.instance = new VideoPollingManager()
    }
    return VideoPollingManager.instance
  }

  registerPassFetcher(passId: string, fn: () => Promise<BinaryDataFile[]>) {
    this.passFetchers.set(passId, fn)
  }

  // Method to check if videos are available for a specific step
  checkVideoAvailability(step: Step, videoStoreName: string, last30s?: boolean): boolean {
    const passVideos = this.getVideosForPass(step.pass_id)
    
    return passVideos.some((file) => {
      if (!file.fileName) return false
      const isMatchingStep =
        file.fileName.includes(step.pass_id) &&
        file.fileName.includes(step.name)
      const isMatchingVideoStore = getVideoStoreName(file) === videoStoreName
      const hasLast30sTag = file.fileName.includes('_last30s_')
      const isMatchingType =
        last30s === undefined || hasLast30sTag === last30s
      
      return isMatchingStep && isMatchingVideoStore && isMatchingType
    })
  }

  // Method to update current videos for availability checking
  updatePassVideos(passId: string, videos: BinaryDataFile[]) {
    this.videosByPass.set(passId, videos)
  }

  addRequest(
    step: Step,
    videoStoreName: string,
    onComplete: () => void,
    onTimeout: () => void,
    last30s?: boolean
  ): string {
    const requestId = `${step.pass_id}-${step.name}${last30s ? '-last30s' : '-full'}`

    if (this.activeRequests.has(requestId)) {
      // Request already exists, just update the callbacks
      const existing = this.activeRequests.get(requestId)!
      existing.onComplete = onComplete
      existing.onTimeout = onTimeout
      return requestId
    }

    const request: PollingRequest = {
      requestId,
      passId: step.pass_id,
      stepName: step.name,
      startTime: Date.now(),
      videoStoreName: videoStoreName,
      onComplete,
      onTimeout,
      last30s,
    }

    this.activeRequests.set(requestId, request)

    // Start polling if not already active
    if (!this.isPolling) {
      this.startPolling()
    }

    return requestId
  }

  removeRequest(requestId: string) {
    this.activeRequests.delete(requestId)

    // Stop polling if no more requests
    if (this.activeRequests.size === 0) {
      this.stopPolling()
    }
  }

  private startPolling() {
    if (this.isPolling) return

    this.isPolling = true

    const poll = async () => {
      if (this.activeRequests.size === 0) {
        this.stopPolling()
        return
      }

      try {
        // Collect unique pass IDs from active requests
        const activePassIds = new Set<string>()
        for (const request of this.activeRequests.values()) {
          activePassIds.add(request.passId)
        }

        // Fetch data for each active pass
        await Promise.all(
          Array.from(activePassIds).map(async (passId) => {
            const fetcher = this.passFetchers.get(passId)
            if (fetcher) {
              try {
                await fetcher()
              } catch (err) {
                console.error(`Error fetching videos for pass ${passId}:`, err)
              }
            }
          })
        )

        for (const [requestId, request] of this.activeRequests.entries()) {
          // Check if videos are available for this step
          const step: Step = {
            name: request.stepName,
            pass_id: request.passId,
            start: new Date(),
            end: new Date(),
          }

          if (this.checkVideoAvailability(step, request.videoStoreName, request.last30s)) {
            console.log(
              `Videos found for ${requestId}, stopping polling for this request`
            )
            request.onComplete()
            this.activeRequests.delete(requestId)
            continue
          }

          // Check timeout
          if (Date.now() - request.startTime > MAX_POLLING_TIME_MS) {
            console.log(`Polling timeout reached for ${requestId}`)
            request.onTimeout()
            this.activeRequests.delete(requestId)
            continue
          }
        }

        // Stop polling if no more active requests
        if (this.activeRequests.size === 0) {
          this.stopPolling()
          return
        }

        // Schedule next poll with interval
        this.pollTimeout = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch (error) {
        console.error('Error during polling:', error)
        // Continue polling on error with interval
        if (this.activeRequests.size > 0) {
          this.pollTimeout = window.setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }

    // Start first poll immediately
    poll()
  }

  private stopPolling() {
    if (this.pollTimeout) {
      window.clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
    this.isPolling = false
  }
 
  private getVideosForPass(passId: string): BinaryDataFile[] {
    return this.videosByPass.get(passId) || []
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size
  }

  // Method to check all active requests for video availability
  checkAllRequestsForVideos() {
    const completedRequests: string[] = []
    console.log(
      `Checking ${this.activeRequests.size} active requests for video availability`
    )

    for (const [requestId, request] of this.activeRequests.entries()) {
      const step: Step = {
        name: request.stepName,
        pass_id: request.passId,
        start: new Date(),
        end: new Date(),
      }

      console.log(
        `Checking request ${requestId} for step ${request.stepName} with pass_id ${request.passId}`
      )
      
      // Log video count for this pass
      const passVideos = this.getVideosForPass(request.passId)
      console.log(`Videos count for pass ${request.passId}: ${passVideos.length}`)

      if (this.checkVideoAvailability(step, request.videoStoreName, request.last30s)) {
        console.log(
          `Videos found for ${requestId}, marking request as complete`
        )
        request.onComplete()
        completedRequests.push(requestId)
      } else {
        console.log(`No videos found yet for ${requestId}`)
      }
    }

    // Remove completed requests
    completedRequests.forEach((requestId) => {
      this.activeRequests.delete(requestId)
    })

    console.log(
      `Completed ${completedRequests.length} requests, ${this.activeRequests.size} remaining`
    )

    // Stop polling if no more active requests
    if (this.activeRequests.size === 0) {
      console.log('No more active requests, stopping polling')
      this.stopPolling()
    }

    return completedRequests.length > 0
  }

  // Method to force a check for videos (called after fetchData updates)
  forceVideoCheck() {
    if (this.activeRequests.size > 0) {
      console.log('Forcing video availability check after data update')
      this.checkAllRequestsForVideos()
    }
  }

  // Add cleanup method
  cleanupAll(): void {
    // Stop the main polling timeout
    if (this.pollTimeout) {
      window.clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }

    // Clear all active requests and state
    this.activeRequests.clear()
    this.passFetchers.clear()
    this.videosByPass.clear()
    this.isPolling = false
  }
}
