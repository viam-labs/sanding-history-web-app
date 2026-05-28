import * as VIAM from '@viamrobotics/sdk'
import { Pass } from '../src/lib/types'
import {
  PASS_QUERY_BATCH_SIZE,
  buildPassSummaryPipeline,
  processTabularDataToPasses,
} from '../src/lib/passQuery'
import { getPassMetadataManager } from '../src/lib/passMetadataManager'
import { ViamConfig } from './args'

export async function connect(config: ViamConfig): Promise<VIAM.ViamClient> {
  return VIAM.createViamClient({
    serviceHost: 'https://app.viam.com',
    credentials: {
      type: 'api-key',
      authEntity: config.apiKeyId,
      payload: config.apiKey,
    },
  })
}

/**
 * Returns the org id to query with: the configured one, or — matching the
 * webapp — the first organization the credentials can see.
 */
export async function resolveOrgId(
  client: VIAM.ViamClient,
  config: ViamConfig
): Promise<string> {
  if (config.orgId) return config.orgId

  const orgs = await client.appClient.listOrganizations()
  if (orgs.length === 0) {
    throw new Error('No organizations available for these credentials')
  }
  return orgs[0].id
}

/**
 * Fetches de-duplicated pass summaries newest-first, paging through the data
 * store. Stops once `limit` passes have been collected (if given).
 */
export async function fetchPasses(
  client: VIAM.ViamClient,
  config: ViamConfig,
  organizationId: string,
  options: { since?: Date; limit?: number }
): Promise<Pass[]> {
  const records: any[] = []
  let olderThan: string | undefined
  let hasMore = true

  while (hasMore) {
    const pipeline = buildPassSummaryPipeline({
      organizationId,
      locationId: config.locationId,
      machineId: config.robotId,
      since: options.since,
      olderThan,
      limit: PASS_QUERY_BATCH_SIZE,
    })

    const batch = await client.dataClient.tabularDataByMQL(
      organizationId,
      pipeline
    )

    if (batch.length === 0) break

    records.push(...batch)

    const last = batch[batch.length - 1] as any
    if (typeof last?.time_received === 'string') {
      olderThan = last.time_received
    } else {
      hasMore = false
    }

    if (batch.length < PASS_QUERY_BATCH_SIZE) hasMore = false
    if (options.limit != null && records.length >= options.limit) hasMore = false
  }

  const passes = processTabularDataToPasses(records)
  return options.limit != null ? passes.slice(0, options.limit) : passes
}

/** Fetches a single pass by id, or null if no record exists. */
export async function fetchPassById(
  client: VIAM.ViamClient,
  config: ViamConfig,
  organizationId: string,
  passId: string
): Promise<Pass | null> {
  const pipeline = buildPassSummaryPipeline({
    organizationId,
    locationId: config.locationId,
    machineId: config.robotId,
    passId,
  })

  const records = await client.dataClient.tabularDataByMQL(
    organizationId,
    pipeline
  )

  if (records.length === 0) return null
  return processTabularDataToPasses(records)[0]
}

export async function fetchDiagnosesForPasses(
  client: VIAM.ViamClient,
  machineId: string,
  passIds: string[]
) {
  return getPassMetadataManager(client, machineId).fetchDiagnosesForPasses(
    passIds
  )
}

export async function fetchNotesForPasses(
  client: VIAM.ViamClient,
  machineId: string,
  passIds: string[]
) {
  return getPassMetadataManager(client, machineId).fetchNotesForPasses(passIds)
}
