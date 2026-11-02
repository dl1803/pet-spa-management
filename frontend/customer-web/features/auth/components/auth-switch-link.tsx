import Link from "next/link";
import type { ReactNode } from "react";

export function AuthSwitchLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-lagoon hover:text-lagoon-700">
      {children}
    </Link>
  );
}

