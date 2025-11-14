import * as VIAM from "@viamrobotics/sdk";
import { Pass, RobotConfigMetadata } from '../types';

/**
 * Extract metadata from a robot part history entry
 */
export const extractConfigMetadata = (entry: any): RobotConfigMetadata => {
  const configTimestamp = entry.when?.toDate ? entry.when.toDate() : new Date();

  return {
    partId: entry.part || '',
    robotId: entry.robot || '',
    configTimestamp,
    editedBy: entry.editedBy,
    hasOldConfig: !!entry.old
  };
};

/**
 * Get the robot configuration that was active at a specific time
 */
export const getRobotConfigAtTime = async (
  viamClient: VIAM.ViamClient,
  partId: string,
  timestamp: Date
): Promise<{ config: any; metadata: RobotConfigMetadata } | null> => {
  try {
    // Fetch the robot part history. The history is sorted from newest to oldest.
    const history = await viamClient.appClient.getRobotPartHistory(partId);

    if (!history || history.length === 0) {
      return null;
    }

    // Find the first entry in the history (from newest to oldest) that is at or before our timestamp.
    // This is the configuration that was active at that moment.
    const activeConfigEntry = history.find(entry => {
      const entryTime = entry.when?.toDate();
      return entryTime && entryTime <= timestamp;
    });

    // If no entry is found, it means the timestamp is before all recorded history.
    if (!activeConfigEntry) {
      return null;
    }

    const metadata = extractConfigMetadata(activeConfigEntry);

    // Return both the config and its metadata
    return {
      config: activeConfigEntry.old?.robotConfig || activeConfigEntry.old,
      metadata,
    };
  } catch (error) {
    console.error("Error getting robot config at time:", error);
    return null;
  }
};

/**
 * Compares the configuration of a pass with the previous pass.
 */
export const getPassConfigComparison = (
  pass: Pass,
  allPasses: Pass[],
  configMetadata: Map<string, RobotConfigMetadata>
): { prevPass: Pass | null; configChanged: boolean } => {
  const currentPassIndex = allPasses.findIndex(p => p.pass_id === pass.pass_id);
  const prevPass = (currentPassIndex > -1 && currentPassIndex < allPasses.length - 1)
    ? allPasses[currentPassIndex + 1]
    : null;

  if (!prevPass) {
    return { prevPass: null, configChanged: false };
  }

  const currentMeta = configMetadata.get(pass.pass_id);
  const prevMeta = configMetadata.get(prevPass.pass_id);

  const configChanged = !!(
    currentMeta &&
    prevMeta &&
    currentMeta.configTimestamp.getTime() !== prevMeta.configTimestamp.getTime()
  );

  return { prevPass, configChanged };
};

/**
 * Download robot configuration as a JSON file
 */
export const downloadRobotConfig = (
  config: any,
  passId: string,
  timestamp: Date,
  machineId: string
): void => {
  try {
    // Helper to pad numbers with a leading zero
    const pad = (num: number) => num.toString().padStart(2, '0');

    // Format the timestamp for filename using local time (YYYY-MM-DD-HH-MM-SS)
    const year = timestamp.getFullYear();
    const month = pad(timestamp.getMonth() + 1); // getMonth() is zero-based
    const day = pad(timestamp.getDate());
    const hours = pad(timestamp.getHours());
    const minutes = pad(timestamp.getMinutes());
    const seconds = pad(timestamp.getSeconds());

    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}-${minutes}-${seconds}`;
    const fileName = `config-${machineId.substring(0, 8)}-pass-${passId.substring(0, 8)}-${dateStr}-${timeStr}.json`;

    // Create a blob with formatted JSON
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';

    // Trigger download
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log(`Downloaded config as ${fileName}`);
  } catch (error) {
    console.error("Error downloading config:", error);
    throw error;
  }
};
