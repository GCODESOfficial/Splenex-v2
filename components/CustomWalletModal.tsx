/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Dialog } from "@headlessui/react";
import { useConnect } from "wagmi";

export default function CustomWalletModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { connectors, connect, isPending } = useConnect();

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-md shadow-lg">
          <Dialog.Title className="text-lg font-bold text-white mb-4">
            Select a Wallet
          </Dialog.Title>
          <div className="space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                disabled={!connector.ready}
                className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center justify-between disabled:opacity-50"
              >
                <span>{connector.name}</span>
                {!connector.ready && <span className="text-xs">Unavailable</span>}
              </button>
            ))}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
