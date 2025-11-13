import * as VIAM from "@viamrobotics/sdk";

/**
 * Test function to verify we can fetch robot part history
 * Call this from the console to test the API
 */
export const testGetRobotPartHistory = async (
  viamClient: VIAM.ViamClient,
  machineId: string,
  partId: string
): Promise<void> => {
  try {
    console.log("Testing getRobotPartHistory with:", { machineId, partId });

    // Check if the method exists
    if (typeof viamClient.appClient.getRobotPartHistory !== 'function') {
      console.error("getRobotPartHistory method not found on appClient");
      console.log("Available methods:", Object.keys(viamClient.appClient));
      return;
    }

    // Try to get the history entries
    const history = await viamClient.appClient.getRobotPartHistory(partId);

    console.log("Success! Robot part history:", history);
    console.log("Number of history entries:", history.length);

    if (history.length > 0) {
      console.log("First entry:", history[0]);
      console.log("Config keys in first entry:", Object.keys(history[0]));
    }
  } catch (error) {
    console.error("Error fetching robot part history:", error);
  }
};

/**
 * Get the robot configuration that was active at a specific time
 */
export const getRobotConfigAtTime = async (
  viamClient: VIAM.ViamClient,
  partId: string,
  timestamp: Date
): Promise<any | null> => {
  try {
    console.log("Fetching robot config for timestamp:", timestamp);

    // Fetch the robot part history
    const history = await viamClient.appClient.getRobotPartHistory(partId);

    if (!history || history.length === 0) {
      console.warn("No history found for part:", partId);
      return null;
    }

    console.log(`Found ${history.length} history entries`);

    // Find the config that was active at the given timestamp
    // History entries have a 'when' field (timestamp) and 'old' field (the config at that time)
    // We need to find the most recent entry where 'when' <= our timestamp
    let activeConfigEntry = null;

    for (const entry of history) {
      const entryTime = entry.when?.toDate ? entry.when.toDate() : null;

      if (!entryTime) continue;

      // If this entry's time is before or equal to our target time
      if (entryTime <= timestamp) {
        // This is a candidate (we want the most recent one before our timestamp)
        const activeConfigEntryTime = activeConfigEntry?.when?.toDate();
        if (!activeConfigEntryTime || entryTime > activeConfigEntryTime) {
          activeConfigEntry = entry;
        }
      }
    }

    if (!activeConfigEntry) {
      console.warn("No config found for timestamp:", timestamp);
      return null;
    }

    console.log("Found matching config entry from:", activeConfigEntry.when?.toDate());

    // Return the 'old' property which contains the RobotPart configuration
    return activeConfigEntry.old;
  } catch (error) {
    console.error("Error getting robot config at time:", error);
    throw error;
  }
};

/**
 * Download robot configuration as a JSON file
 */
export const downloadRobotConfig = (config: any, passId: string, timestamp: Date): void => {
  try {
    // Format the timestamp for filename
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const fileName = `robot-config-${passId.substring(0, 8)}-${dateStr}-${timeStr}.json`;

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
