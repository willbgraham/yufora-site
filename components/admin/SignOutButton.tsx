"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-md px-3 py-2 text-sm text-warm-600 hover:bg-warm-100 hover:text-warm-900"
    >
      Sign out
    </button>
  );
}
