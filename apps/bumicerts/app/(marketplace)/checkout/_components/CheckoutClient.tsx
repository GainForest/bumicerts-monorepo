"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useCartStore } from "@/components/stores/cart";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useAccount } from "wagmi";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import { links } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { IndividualAmounts } from "./IndividualAmounts";
import { CheckoutSummary } from "./CheckoutSummary";
import { PaymentSection } from "./PaymentSection";
import { ShareSuccess } from "./ShareSuccess";
import { useCheckoutFlow, type CheckoutItem } from "./hooks/useCheckoutFlow";
import { useBatchPayment } from "./hooks/useBatchPayment";
import type { CartBumicertItem } from "@/graphql/indexer/queries/cartBumicert";
import type { EvmLink } from "@/graphql/indexer/queries/linkEvm";
import Container from "@/components/ui/container";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_AMOUNT = 25;

function isLinkValid(
  link: EvmLink,
  facilitatorAddress: string | undefined,
): boolean {
  if (link.specialMetadata?.valid !== true) return false;
  if (!facilitatorAddress) return true;
  const pa = link.record?.platformAttestation?.platformAddress;
  if (!pa) return false;
  return pa.toLowerCase() === facilitatorAddress.toLowerCase();
}

function isDonationOpen(
  item: CartBumicertItem,
  evmLinks: EvmLink[],
  facilitatorAddress: string | undefined,
): boolean {
  if (!item.fundingConfig) return false;
  const walletUri = item.fundingConfig.receivingWallet?.uri;
  if (!walletUri) return false;
  if ((item.fundingConfig.status ?? "open") !== "open") return false;
  const link = evmLinks.find((l) => l.metadata?.uri === walletUri);
  return !!link && isLinkValid(link, facilitatorAddress);
}

// ---------------------------------------------------------------------------
// Item Loader — fetches bumicert + wallet data for a single cart item
// ---------------------------------------------------------------------------

function useCheckoutItemLoader(
  id: string,
  facilitatorAddress: string | undefined,
) {
  const { data: item, isLoading: itemLoading } =
    indexerTrpc.claim.activity.get.useQuery({ id }, { retry: false });
  const ownerDid = item?.organizationDid ?? "";
  const { data: evmLinks = [], isLoading: linksLoading } =
    indexerTrpc.link.evm.list.useQuery(
      { did: ownerDid },
      { enabled: !!ownerDid, retry: false },
    );

  const isLoading = itemLoading || (!!ownerDid && linksLoading);
  const isOpen = item
    ? isDonationOpen(item, evmLinks, facilitatorAddress)
    : false;

  return { item, isLoading, isOpen };
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ShoppingCartIcon className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2
          className="text-2xl font-light tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Your cart is empty
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add bumicerts you&apos;d like to support
        </p>
      </div>
      <Button asChild className="rounded-full px-6">
        <Link href={links.explore}>Explore Bumicerts</Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="border border-border rounded-2xl p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CheckoutClient() {
  const cartIds = useCartStore((s) => s.items);
  const removeFromCart = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const auth = useAtprotoStore((s) => s.auth);
  const { address } = useAccount();

  const facilitatorAddress = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;

  const donorDid = auth.authenticated ? auth.user.did : undefined;

  // Items state
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  // Anonymous checkbox
  const [donorChoseAnonymous, setDonorChoseAnonymous] = useState(false);

  const shouldStoreDonationAsAnonymous = donorDid ? donorChoseAnonymous : true;

  // Checkout flow
  const { state, error, result, setState, setError, setResult, reset } =
    useCheckoutFlow();

  // Batch payment
  const { executeBatchPayment } = useBatchPayment({
    address,
    donorDid,
    shouldStoreDonationAsAnonymous,
    onSigning: () => setState("signing"),
    onProcessing: () => setState("processing"),
    onSuccess: (r) => {
      setResult(r);
      setState("success");
      clearCart();
    },
    onError: (e) => {
      setError(e);
      setState("error");
    },
  });

  // Calculate total
  const calculatedTotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.amount, 0);
  }, [checkoutItems]);

  // Handle item amount change
  const handleItemAmountChange = useCallback((id: string, amount: number) => {
    setCheckoutItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount } : item)),
    );
  }, []);

  // Handle setting all items to the same amount
  const handleSetAllAmounts = useCallback((amount: number) => {
    setCheckoutItems((prev) => prev.map((item) => ({ ...item, amount })));
  }, []);

  // Handle remove item
  const handleRemoveItem = useCallback(
    (id: string) => {
      removeFromCart(id);
      setCheckoutItems((prev) => prev.filter((item) => item.id !== id));
    },
    [removeFromCart],
  );

  // Handle pay
  const handlePay = useCallback(() => {
    if (checkoutItems.length === 0 || calculatedTotal <= 0) return;
    executeBatchPayment(checkoutItems, calculatedTotal);
  }, [checkoutItems, calculatedTotal, executeBatchPayment]);

  // No items in cart
  if (cartIds.length === 0 && state !== "success") {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-6">
        <EmptyState />
      </div>
    );
  }

  // Success state
  if (state === "success" && result) {
    return (
      <Container>
        <ShareSuccess checkoutResults={result} />
      </Container>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-light tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Checkout
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set your donation amount for each bumicert
        </p>
      </div>

      {/* Error state */}
      {state === "error" && error && (
        <div className="mb-6 p-4 border border-destructive/30 bg-destructive/5 rounded-2xl">
          <p className="text-sm text-destructive font-medium">
            Payment failed: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={reset}
          >
            Try again
          </Button>
        </div>
      )}

      <div className="space-y-8">
        {/* Cart Items Loader */}
        <CartItemsLoader
          cartIds={cartIds}
          facilitatorAddress={facilitatorAddress}
          setCheckoutItems={setCheckoutItems}
          loadedIds={loadedIds}
          setLoadedIds={setLoadedIds}
        />

        {/* Items */}
        {loadedIds.size < cartIds.length ? (
          <LoadingState />
        ) : checkoutItems.length === 0 ? (
          <div className="border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">
              None of the items in your cart are currently accepting donations.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
            >
              <Link href={links.explore}>Explore other bumicerts</Link>
            </Button>
          </div>
        ) : (
          <IndividualAmounts
            items={checkoutItems}
            onItemAmountChange={handleItemAmountChange}
            onRemoveItem={handleRemoveItem}
            onSetAllAmounts={handleSetAllAmounts}
          />
        )}

        {/* Summary */}
        {checkoutItems.length > 0 && (
          <CheckoutSummary
            items={checkoutItems}
            totalAmount={calculatedTotal}
          />
        )}

        {/* Anonymous checkbox */}
        {auth.authenticated && checkoutItems.length > 0 && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={donorChoseAnonymous}
              onChange={(e) => setDonorChoseAnonymous(e.target.checked)}
              className="mt-1 size-4 rounded border-border"
            />
            <div>
              <span className="text-sm font-medium">Donate anonymously</span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Your wallet address will be recorded, but not your identity.
              </p>
            </div>
          </label>
        )}

        {/* Payment */}
        {checkoutItems.length > 0 && (
          <PaymentSection
            totalAmount={calculatedTotal}
            state={state}
            onPay={handlePay}
            disabled={checkoutItems.length === 0 || calculatedTotal <= 0}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart Items Loader — uses hooks per item
// ---------------------------------------------------------------------------

function CartItemsLoader({
  cartIds,
  facilitatorAddress,
  setCheckoutItems,
  loadedIds,
  setLoadedIds,
}: {
  cartIds: string[];
  facilitatorAddress: string | undefined;
  setCheckoutItems: React.Dispatch<React.SetStateAction<CheckoutItem[]>>;
  loadedIds: Set<string>;
  setLoadedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  return (
    <>
      {cartIds.map((id) => (
        <SingleItemLoader
          key={id}
          id={id}
          facilitatorAddress={facilitatorAddress}
          loadedIds={loadedIds}
          setLoadedIds={setLoadedIds}
          setCheckoutItems={setCheckoutItems}
        />
      ))}
    </>
  );
}

function SingleItemLoader({
  id,
  facilitatorAddress,
  loadedIds,
  setLoadedIds,
  setCheckoutItems,
}: {
  id: string;
  facilitatorAddress: string | undefined;
  loadedIds: Set<string>;
  setLoadedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCheckoutItems: React.Dispatch<React.SetStateAction<CheckoutItem[]>>;
}) {
  const { item, isLoading, isOpen } = useCheckoutItemLoader(
    id,
    facilitatorAddress,
  );

  useEffect(() => {
    if (isLoading) return;
    if (loadedIds.has(id)) return;

    setLoadedIds((prev) => new Set([...prev, id]));

    if (!item || !isOpen) return;

    const checkoutItem: CheckoutItem = {
      id: item.id,
      bumicertId: item.id,
      activityUri: `at://${item.organizationDid}/org.hypercerts.claim.activity/${item.rkey}`,
      orgDid: item.organizationDid,
      title: item.title ?? "Untitled",
      organizationName: item.organizationName ?? "Unknown",
      amount: DEFAULT_AMOUNT,
    };

    setCheckoutItems((prev) => {
      // Avoid duplicates
      if (prev.some((p) => p.id === checkoutItem.id)) return prev;
      return [...prev, checkoutItem];
    });
  }, [id, item, isLoading, isOpen, loadedIds, setLoadedIds, setCheckoutItems]);

  // This component doesn't render anything — it just loads data
  return null;
}
