"use client";

/**
 * HeaderContent — declarative, self-cleaning header slot injector.
 *
 * Drop this component anywhere inside a page tree to fill the three
 * header slots (left, right, sub).  When the component unmounts (i.e.
 * when the user navigates away) the slots are automatically cleared —
 * no need to manually reset them to null on every route.
 *
 * Usage:
 *   <HeaderContent right={<MyButtons />} sub={<StepProgress />} />
 *
 * - Slots you omit are left untouched.
 * - Slots update reactively: whenever the parent re-renders with new
 *   prop values, the header re-renders too.
 * - On unmount, every slot that was set is automatically cleared.
 *
 * For slot content that manages its own reactivity (e.g. a component
 * that reads Zustand state internally), just pass the JSX element and
 * let that component handle updates — this is the recommended pattern.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useHeaderSlots } from "./context";

interface HeaderContentProps {
  left?: ReactNode;
  right?: ReactNode;
  sub?: ReactNode;
}

export function HeaderContent({ left, right, sub }: HeaderContentProps) {
  const setLeftContent = useHeaderSlots((s) => s.setLeftContent);
  const setRightContent = useHeaderSlots((s) => s.setRightContent);
  const setSubHeaderContent = useHeaderSlots((s) => s.setSubHeaderContent);

  // Track which slots we've "claimed" so unmount only clears what we set.
  const claimedRef = useRef({ left: false, right: false, sub: false });

  useEffect(() => {
    if (left !== undefined) {
      setLeftContent(left);
      claimedRef.current.left = true;
    }
    if (right !== undefined) {
      setRightContent(right);
      claimedRef.current.right = true;
    }
    if (sub !== undefined) {
      setSubHeaderContent(sub);
      claimedRef.current.sub = true;
    }
  }, [left, right, sub, setLeftContent, setRightContent, setSubHeaderContent]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (claimedRef.current.left) setLeftContent(null);
      if (claimedRef.current.right) setRightContent(null);
      if (claimedRef.current.sub) setSubHeaderContent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
