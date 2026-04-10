"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
};

export function SignOutButton({
  label = "Cerrar sesión",
  variant = "ghost",
  size = "sm",
  className = "",
  showIcon = true,
}: Props) {
  async function handleClick() {
    await fetch("/api/auth/clear-impersonate", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`gap-2 ${className}`.trim()}
      onClick={() => void handleClick()}
    >
      {showIcon ? <LogOut className="h-4 w-4 shrink-0" /> : null}
      {label}
    </Button>
  );
}
