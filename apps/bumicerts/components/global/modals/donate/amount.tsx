"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useAccount } from "wagmi";
import type { BumicertData } from "@/lib/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { WalletModal } from "./wallet";
import { useUSDCBalance } from "./hooks/useUSDCBalance";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100] as const;
const DEFAULT_AMOUNT = 25;

interface AmountModalProps {
  bumicert: BumicertData;
}

export function AmountModal({ bumicert }: AmountModalProps) {
  const { pushModal, stack, hide, popModal } = useModal();
  const auth = useAtprotoStore((state) => state.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";
  const { address, isConnected } = useAccount();
  const { balance, isLoading: isBalanceLoading } = useUSDCBalance(address);

  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [customInput, setCustomInput] = useState<string>(String(DEFAULT_AMOUNT));
  const [anonymous, setAnonymous] = useState(false);

  const handleClose = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  const handlePreset = (preset: number) => {
    setAmount(preset);
    setCustomInput(String(preset));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed);
  };

  const handleContinue = () => {
    pushModal({
      id: MODAL_IDS.DONATE_WALLET,
      content: (
        <WalletModal
          bumicert={bumicert}
          amount={amount}
          anonymous={anonymous}
        />
      ),
    });
  };

  const isValid = amount > 0 && !isNaN(amount);

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Support a bumicert</ModalTitle>
        <ModalDescription>
          {bumicert.title}
          {bumicert.organizationName ? ` · ${bumicert.organizationName}` : ""}
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">How much would you like to donate?</label>
          {isConnected && (
            <span className="text-xs text-muted-foreground">
              {isBalanceLoading
                ? "Loading balance…"
                : balance !== null
                  ? `Balance: ${balance} USDC`
                  : "Balance unavailable"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
          <span className="text-muted-foreground font-medium">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={customInput}
            onChange={handleCustomChange}
            className="flex-1 bg-transparent outline-none text-lg font-semibold"
            placeholder="25"
          />
          <span className="text-xs text-muted-foreground">USDC</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                amount === preset
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <span className="text-sm font-medium">Donate anonymously</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your wallet address will be recorded, but not your identity.
            </p>
          </div>
        </label>
      )}

      <ModalFooter className="flex flex-col gap-2 pt-2">
        <Button onClick={handleContinue} disabled={!isValid} className="w-full">
          Continue with Wallet
        </Button>
        <Button variant="outline" disabled className="w-full opacity-60 cursor-not-allowed">
          Continue with Card
          <span className="text-xs bg-muted-foreground text-muted px-1 rounded-xs uppercase font-mono">Coming soon</span>
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
