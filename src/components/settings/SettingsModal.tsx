import { useSettingsStore } from "@/stores/settingsStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GitHubIcon, ExternalLinkIcon } from "@/components/ui/Icons";
import { SyncStatusSection } from "./SyncStatusSection";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Settings are initialized at extension startup in content.tsx
  const { debugLogging, setDebugLogging, isLoading } = useSettingsStore();

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
          <SyncStatusSection />
        </div>

        <div className="pt-4 border-t border-poe-gray space-y-3">
          <a
            href="https://github.com/HazAT/poe-item-search"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-poe-beige hover:text-poe-beige-light transition-colors"
          >
            <GitHubIcon className="w-4 h-4" />
            <span>GitHub</span>
            <ExternalLinkIcon className="w-3 h-3 text-poe-gray-alt" />
          </a>
          <a
            href="https://github.com/HazAT/poe-item-search/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-poe-beige hover:text-poe-beige-light transition-colors ml-6"
          >
            <span>Report a bug / Request a feature</span>
            <ExternalLinkIcon className="w-3 h-3 text-poe-gray-alt" />
          </a>
          <div className="text-xs text-poe-gray-alt pt-1">
            PoE Item Search v{__APP_VERSION__}
          </div>
        </div>
      </div>
    </Modal>
  );
}
