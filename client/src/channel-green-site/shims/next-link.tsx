import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link as WouterLink } from "wouter";
import { cgPath } from "../config";

// Stand-in for next/link so Channel Green's own components run unchanged inside this site.
export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <WouterLink href={cgPath(href)} {...rest}>{children}</WouterLink>;
}
