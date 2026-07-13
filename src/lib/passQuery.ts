import { Pass } from './types'

export const SANDING_SUMMARY_NAME = 'sanding-summary'
export const SANDING_SUMMARY_COMPONENT_TYPE = 'rdk:component:sensor'
export const PASS_QUERY_BATCH_SIZE = 1000

/**
 * Transforms a raw tabular-data record from the sanding-summary MQL query into a
 * Pass. Each record nests the sensor reading under `data.readings`.
 */
export function processTabularDataToPasses(tabularData: any[]): Pass[] {
  return tabularData.map((item: any) => {
    const pass = item.data!.readings!
    const buildInfo = pass.build_info ? pass.build_info : {}

    return {
      start: new Date(pass.start),
      end: new Date(pass.end),
      steps: pass.steps
        ? pass.steps.map((x: any) => ({
            name: x.name!,
            start: new Date(x.start),
            end: new Date(x.end),
            pass_id: pass.pass_id,
          }))
        : [],
      success: pass.success ?? true,
      pass_id: pass.pass_id,
      err_string: pass.err_string || null,
      build_info: buildInfo,
      pass_mode: pass.pass_mode != null ? String(pass.pass_mode) : undefined,
      sanding_distance_mm:
        pass.sanding_distance_mm != null
          ? Number(pass.sanding_distance_mm)
          : undefined,
      selected_zones:
        pass.selected_zones != null ? pass.selected_zones : undefined,
      selected_num_rounds:
        pass.selected_num_rounds != null
          ? Number(pass.selected_num_rounds)
          : undefined,
      piece_id: pass.piece_id != null ? String(pass.piece_id) : undefined,
      piece_type: pass.piece_type != null ? String(pass.piece_type) : undefined,
      piece_model: pass.piece_model != null ? String(pass.piece_model) : undefined,
      piece_serial: pass.piece_serial != null ? String(pass.piece_serial) : undefined,
      version: pass.version != null ? Number(pass.version) : undefined,
      current_state:
        pass.current_state != null ? String(pass.current_state) : undefined,
    }
  })
}

export interface PassSummaryQueryOptions {
  organizationId: string
  locationId: string
  machineId: string
  /** Only include records with time_received >= since (applied before grouping). */
  since?: Date
  /** Restrict to a single pass (applied before grouping). */
  passId?: string
  /** Pagination cursor: only include unique passes with time_received < olderThan. */
  olderThan?: string
  /** Cap the number of returned passes. */
  limit?: number
}

/**
 * Builds the MQL pipeline that backs the sanding-history list and detail views.
 * Records are de-duplicated per pass_id by keeping the highest `version`, then
 * sorted newest-first by time_received.
 */
export function buildPassSummaryPipeline(
  options: PassSummaryQueryOptions
): Record<string, any>[] {
  const { organizationId, locationId, machineId, since, passId, olderThan, limit } =
    options

  const match: Record<string, any> = {
    organization_id: organizationId,
    location_id: locationId,
    component_name: SANDING_SUMMARY_NAME,
    robot_id: machineId,
    component_type: SANDING_SUMMARY_COMPONENT_TYPE,
  }
  if (since) {
    match.time_received = { $gte: since }
  }
  if (passId) {
    match['data.readings.pass_id'] = passId
  }

  const pipeline: Record<string, any>[] = [
    { $match: match },
    // Sort by version descending so $first in $group picks the highest-version record per pass
    { $sort: { 'data.readings.version': -1 } },
    { $group: { _id: '$data.readings.pass_id', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { time_received: -1 } },
  ]

  // Time filter after grouping so the cursor operates on unique passes rather
  // than raw version records.
  if (olderThan) {
    pipeline.push({ $match: { time_received: { $lt: olderThan } } })
  }
  if (limit != null) {
    pipeline.push({ $limit: limit })
  }

  return pipeline
}
