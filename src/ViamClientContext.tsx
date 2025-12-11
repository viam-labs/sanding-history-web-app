import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import Cookies from "js-cookie";

interface ViamClientContextType {
  viamClient: VIAM.ViamClient | null;
  robotClient: VIAM.RobotClient | null;
  machineId: string;
  hostname: string;
  apiKeyId: string;
  apiKeySecret: string;
  machineName: string | null;
  locationId: string | null;
  organizationId: string | null;
}

const ViamClientContext = createContext<ViamClientContextType | undefined>(undefined);

const locationIdRegex = /main\.([^.]+)\.viam\.cloud/;
const machineNameRegex = /\/machine\/(.+?)-main\./;

async function connect(apiKeyId: string, apiKeySecret: string): Promise<VIAM.ViamClient> {
  const opts: VIAM.ViamClientOptions = {
    serviceHost: "https://app.viam.com",
    credentials: {
      type: "api-key",
      authEntity: apiKeyId,
      payload: apiKeySecret,
    },
  };

  return await VIAM.createViamClient(opts);
}

async function connectToUser(accessToken: string): Promise<VIAM.ViamClient> {
  const opts: VIAM.ViamClientOptions = {
    serviceHost: "https://app.viam.com",
    credentials: {
      type: "access-token",
      payload: accessToken,
    },
  };

  return await VIAM.createViamClient(opts);
}

export function ViamClientProvider({ children }: { children: ReactNode }) {
  const [viamClient, setViamClient] = useState<VIAM.ViamClient | null>(null);
  const [robotClient, setRobotClient] = useState<VIAM.RobotClient | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const machineNameMatch = window.location.pathname.match(machineNameRegex);
  const machineName = machineNameMatch ? machineNameMatch[1] : null;

  const locationIdMatch = window.location.pathname.match(locationIdRegex);
  const locationId = locationIdMatch ? locationIdMatch[1] : null;

  const machineInfo = window.location.pathname.split("/")[2];

  const {
    apiKey: { id: apiKeyId, key: apiKeySecret },
    machineId,
    hostname,
  } = JSON.parse(Cookies.get(machineInfo)!);


  useEffect(() => {
    const initializeClients = async () => {
      console.log("Initializing Viam clients");
      
      const vClient = await connect(apiKeyId, apiKeySecret);
      setViamClient(vClient);

      try {
        const organizations = await vClient.appClient.listOrganizations();
        if (organizations.length > 0) {
          setOrganizationId(organizations[0].id);
        } else {
          console.warn("No organizations found");
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error);
      }

      try {
        const rClient = await vClient.connectToMachine({
          host: hostname,
          id: machineId,
        });
        setRobotClient(rClient);
      } catch (error) {
        console.error('Failed to create robot client:', error);
        setRobotClient(null);
      }
    };

    initializeClients();
  }, [apiKeyId, apiKeySecret, hostname, machineId]);

  return (
    <ViamClientContext.Provider
      value={{
        viamClient,
        robotClient,
        machineId,
        hostname,
        apiKeyId,
        apiKeySecret,
        machineName,
        locationId,
        organizationId,
      }}
    >
      {children}
    </ViamClientContext.Provider>
  );
}

export function useViamClient() {
  const context = useContext(ViamClientContext);
  if (context === undefined) {
    throw new Error('useViamClient must be used within a ViamClientProvider');
  }
  return context;
}

