"use client";

import { useSession } from "@/lib/auth-client";
import { SignInButton } from "./sign-in-button";
import { SignOutButton } from "./sign-out-button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

export function UserProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <SignInButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden md:inline">
        Welcome {session.user?.name}
      </span>
      <Link
        href="/settings"
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        title="Settings"
      >
        <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </Link>
      <Avatar className="size-8">
        <AvatarImage
          src={session.user?.image || ""}
          alt={session.user?.name || "User"}
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>
          {(
            session.user?.name?.[0] ||
            session.user?.email?.[0] ||
            "U"
          ).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <SignOutButton />
    </div>
  );
}
