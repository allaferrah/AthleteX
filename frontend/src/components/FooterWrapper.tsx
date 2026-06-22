"use client";

import { usePathname } from "next/navigation";
import FooterSection from "./FooterSection";

export default function FooterWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard/admin")) return null;
  return <FooterSection />;
}