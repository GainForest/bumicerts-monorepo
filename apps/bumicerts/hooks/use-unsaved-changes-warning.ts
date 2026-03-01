"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Hook to warn users when they try to leave the page with unsaved changes.
 * Shows the browser's native "You have unsaved changes" dialog.
 *
 * @param isDirty - Whether there are unsaved changes
 * @param enabled - Whether the warning should be active (default: true)
 */
export function useUnsavedChangesWarning(
  isDirty: boolean,
  enabled: boolean = true
) {
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync with prop
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isDirtyRef.current) {
      // Standard way to show the browser's native dialog
      event.preventDefault();
      // For older browsers
      event.returnValue = "";
      return "";
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, handleBeforeUnload]);
}

export default useUnsavedChangesWarning;
