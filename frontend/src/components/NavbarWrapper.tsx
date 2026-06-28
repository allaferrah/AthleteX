"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Safely check if we are on an admin route (pathname can be null in some Next.js edge cases)
  const isAdminRoute = pathname?.startsWith("/dashboard/admin");

  if (isAdminRoute) {
    return null;
  }

  return <Navbar />;
}
