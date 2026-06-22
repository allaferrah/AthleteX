"use client";

import { usePathname } from "next/navigation";

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/dashboard/admin");

  if (isAdmin) {
    return <div className="flex-1 relative z-10">{children}</div>;
  }

  return (
    <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
      {children}
    </main>
  );
}