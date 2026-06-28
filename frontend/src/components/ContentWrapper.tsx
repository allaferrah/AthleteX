"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface ContentWrapperProps {
  children: ReactNode;
}

export default function ContentWrapper({ children }: ContentWrapperProps) {
  const pathname = usePathname();

  // Determine if the current route needs a raw, unpadded layout (Home or Admin)
  const isUnpaddedLayout = pathname === "/" || pathname.startsWith("/dashboard/admin");

  // Base classes applied to all wrapper states
  const baseClasses = "flex-1 relative z-10";

  if (isUnpaddedLayout) {
    return <div className={baseClasses}>{children}</div>;
  }

  return (
    <main className={`${baseClasses} pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full`}>
      {children}
    </main>
  );
}
