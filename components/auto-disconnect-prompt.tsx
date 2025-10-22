"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Power, Shield } from "lucide-react";

interface AutoDisconnectPromptProps {
  isOpen: boolean;
  onStayConnected: () => void;
  onDisconnect: () => void;
  onToggleAutoDisconnect: (enabled: boolean) => void;
  autoDisconnectEnabled: boolean;
}

export function AutoDisconnectPrompt({
  isOpen,
  onStayConnected,
  onDisconnect,
  onToggleAutoDisconnect,
  autoDisconnectEnabled,
}: AutoDisconnectPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0C0C0C] border-2 border-yellow-400 max-w-md w-full p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">Inactive Session Detected</h2>
            <p className="text-gray-400 text-sm">You've been away for 30 minutes</p>
          </div>
        </div>

        <div className="bg-[#1F1F1F] p-4 rounded mb-4">
          <p className="text-gray-300 text-sm mb-3">
            For your security, we recommend disconnecting your wallet when not actively trading.
          </p>
          <p className="text-yellow-400 text-xs">
            ⚠️ This wallet will be disconnected automatically in 2 minutes if no action is taken.
          </p>
        </div>

        <div className="flex gap-3 mb-4">
          <Button
            onClick={onStayConnected}
            className="flex-1 bg-gradient-to-r from-[#F3DA5F] to-[#FCD404] text-black font-medium rounded-none"
          >
            <Shield className="h-4 w-4 mr-2" />
            Stay Connected
          </Button>
          <Button
            onClick={onDisconnect}
            variant="outline"
            className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10 rounded-none"
          >
            <Power className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="auto-disconnect"
            checked={autoDisconnectEnabled}
            onChange={(e) => onToggleAutoDisconnect(e.target.checked)}
            className="w-4 h-4 accent-yellow-400"
          />
          <label htmlFor="auto-disconnect" className="text-gray-400 cursor-pointer">
            Enable auto-disconnect for security (recommended)
          </label>
        </div>
      </div>
    </div>
  );
}


