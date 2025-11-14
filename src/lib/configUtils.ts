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

    // Find the first history entry that occurred AT or BEFORE the requested timestamp.
    // This entry represents the last change made before or at our target time.
    const lastChangeEntry = history.find(entry => {
      const entryTime = entry.when?.toDate();
      return entryTime && entryTime <= timestamp;
    });

    // If no such entry exists, the timestamp is before any recorded history.
    if (!lastChangeEntry) {
      return null;
    }

    // The configuration that was active is the state AFTER this last change.
    // This state is stored in the `old` field of the NEXT NEWER entry in the history.
    const lastChangeIndex = history.indexOf(lastChangeEntry);

    let configEntry;
    if (lastChangeIndex > 0) {
      // The next newer entry is at the previous index because the list is sorted newest to oldest.
      configEntry = history[lastChangeIndex - 1];
    } else {
      // If the last change is the most recent one in history (index 0),
      // we can't get its "after" state from a newer entry.
      // In this case, we assume the main part's config is the current state.
      // We fetch the robot part directly to get the absolute latest config.
      const part = await viamClient.appClient.getRobotPart(partId);
      configEntry = { old: part }; // Adapt it to look like a history entry
    }

    if (!configEntry || !configEntry.old) {
      return null;
    }

    const robotPart = configEntry.old as any;
    if (!robotPart || !robotPart.robotConfig) {
      console.error("Invalid config structure in history entry");
      return null;
    }

    // The actual config is in the fields property. Apply fragment mods to get the final state.
    const baseConfig = robotPart.robotConfig.fields || robotPart.robotConfig;
    const finalConfig = applyFragmentMods(baseConfig);
    const metadata = extractConfigMetadata(lastChangeEntry);

    return {
      config: finalConfig,
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

/**
 * Applies a single modification to the configuration object.
 * This is a simplified implementation and may need to be expanded
 * to handle all pathing cases (e.g., finding components by name).
 */
const applyMod = (config: any, path: string, value: any): void => {
  const keys = path.split('.');
  let current = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Handle array pathing like "components[name=my-component]"
    const arrayMatch = key.match(/(\w+)\[(\w+)=(.+)\]/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const propName = arrayMatch[2];
      const propValue = arrayMatch[3];
      if (current[arrayName] && Array.isArray(current[arrayName])) {
        const foundItem = current[arrayName].find(
          (item: any) => item[propName] === propValue
        );
        if (foundItem) {
          current = foundItem;
          continue;
        }
      }
    }

    if (typeof current[key] === 'undefined') {
      // If path doesn't exist, create it.
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
};

/**
 * Merges fragment modifications into a base robot configuration.
 */
export const applyFragmentMods = (config: any): any => {
  if (!config.fragment_mods || !Array.isArray(config.fragment_mods)) {
    return config;
  }

  const newConfig = JSON.parse(JSON.stringify(config));

  for (const fragmentMod of newConfig.fragment_mods) {
    if (fragmentMod.mods && Array.isArray(fragmentMod.mods)) {
      for (const mod of fragmentMod.mods) {
        if (mod.$set) {
          for (const path in mod.$set) {
            // A more robust solution would be needed to find components by name
            // This is a simplified example.
            const componentMatch = path.match(/components\.(\w+)\.(.+)/);
            if (componentMatch) {
              const componentName = componentMatch[1];
              const restOfPath = componentMatch[2];
              const component = newConfig.components?.find(
                (c: any) => c.name === componentName
              );
              if (component) {
                applyMod(component, restOfPath, mod.$set[path]);
              }
            } else {
              applyMod(newConfig, path, mod.$set[path]);
            }
          }
        }
        // TODO: Handle other operations like $unset if necessary
      }
    }
  }
  // delete newConfig.fragment_mods; // Optional: clean up
  // delete newConfig.fragments; // Optional: clean up
  return newConfig;
};
