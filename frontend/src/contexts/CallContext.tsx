"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface CallContextValue {
  isInCall: boolean;
  setInCall: (v: boolean) => void;
}

const CallContext = createContext<CallContextValue>({
  isInCall: false,
  setInCall: () => {},
});

export function CallProvider({ children }: { children: ReactNode }) {
  const [isInCall, setInCall] = useState(false);
  return (
    <CallContext.Provider value={{ isInCall, setInCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useInCall() {
  return useContext(CallContext);
}
