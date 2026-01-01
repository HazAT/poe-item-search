import { useState, useEffect, useCallback } from "react";

const HEARTBEAT_INTERVAL = 3000; // 3 seconds
const HEARTBEAT_TIMEOUT = 2000; // 2 seconds

type ConnectionStatus = "connected" | "disconnected" | "checking";

export function DevModeIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

  const checkConnection = useCallback(async () => {
    // Don't attempt if not in extension context
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      setStatus("disconnected");
      return;
    }

    try {
      const response = await Promise.race([
        new Promise<{ type: string } | undefined>((resolve) => {
          chrome.runtime.sendMessage(
            { type: "DEV_HEARTBEAT_PING" },
            (response) => {
              // Check for runtime errors (extension context invalidated)
              if (chrome.runtime.lastError) {
                resolve(undefined);
              } else {
                resolve(response);
              }
            }
          );
        }),
        new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), HEARTBEAT_TIMEOUT)
        ),
      ]);

      if (response?.type === "DEV_HEARTBEAT_PONG") {
        setStatus("connected");
      } else {
        setStatus("disconnected");
      }
    } catch {
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up interval
    const intervalId = setInterval(checkConnection, HEARTBEAT_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkConnection]);

  const statusColors = {
    connected: "bg-green-500",
    disconnected: "bg-red-500",
    checking: "bg-yellow-500",
  };

  const statusLabels = {
    connected: "Dev reload active",
    disconnected: "Dev reload disconnected",
    checking: "Checking...",
  };

  return (
    <div className="flex items-center gap-1.5" title={statusLabels[status]}>
      <span className="text-xs text-poe-gray-alt uppercase tracking-wider">
        DEV
      </span>
      <div
        className={`w-2 h-2 rounded-full ${statusColors[status]} ${
          status === "checking" ? "animate-pulse" : ""
        }`}
      />
    </div>
  );
}
