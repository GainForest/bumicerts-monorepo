"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Viewport = "mobile" | "desktop";
type OpenState = { mobile: boolean; desktop: boolean };

interface NavbarContextValue {
  viewport: Viewport;
  openState: OpenState;
  setOpenState: (value?: boolean, viewport?: Viewport) => void;
}

const NavbarContext = createContext<NavbarContextValue>({
  viewport: "desktop",
  openState: { mobile: false, desktop: true },
  setOpenState: () => {},
});

export function NavbarContextProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [openState, setOpenStateInternal] = useState<OpenState>({
    mobile: false,
    desktop: true,
  });

  useEffect(() => {
    const check = () => {
      setViewport(window.innerWidth >= 768 ? "desktop" : "mobile");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const setOpenState = (value?: boolean, vp?: Viewport) => {
    const target = vp ?? viewport;
    setOpenStateInternal((prev) => ({
      ...prev,
      [target]: value !== undefined ? value : !prev[target],
    }));
  };

  return (
    <NavbarContext.Provider value={{ viewport, openState, setOpenState }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbarContext() {
  return useContext(NavbarContext);
}
