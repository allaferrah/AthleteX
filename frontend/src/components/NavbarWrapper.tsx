"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Safely check if we are on an admin or dashboard route (pathname can be null in some Next.js edge cases)
  const isAdminRoute = pathname?.startsWith("/dashboard/admin");
  const isDashboardRoute = pathname?.startsWith("/dashboard/user") || pathname?.startsWith("/dashboard/expert");

  if (isAdminRoute || isDashboardRoute) {
    return null;
  }

  return <Navbar />;
}
