import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { debugLogging, setDebugLogging, isLoading, initialize } = useSettingsStore();

  useEffect(() => {
    if (isOpen) {
      initialize();
    }
  }, [isOpen, initialize]);

  const handleToggleDebug = () => {
    setDebugLogging(!debugLogging);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-poe-gray-alt">Loading...</div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-poe-beige font-fontin">Debug Logging</div>
              <div className="text-xs text-poe-gray-alt">
                Enable detailed console logs for debugging
              </div>
            </div>
            <button
              onClick={handleToggleDebug}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${debugLogging ? "bg-poe-green" : "bg-poe-gray-alt"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${debugLogging ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-poe-gray">
          <div className="text-xs text-poe-gray-alt">
            PoE Item Search v1.2.0
          </div>
        </div>
      </div>
    </Modal>
  );
}
