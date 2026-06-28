"use client";

import { usePathname } from "next/navigation";
import { useInCall } from "@/contexts/CallContext";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  const { isInCall } = useInCall();

  // Safely check if we are on an admin route (pathname can be null in some Next.js edge cases)
  const isAdminRoute = pathname?.startsWith("/dashboard/admin");

  if (isAdminRoute || isInCall) {
    return null;
  }

  return <Navbar />;
}
