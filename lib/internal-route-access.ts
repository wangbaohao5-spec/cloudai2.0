import { getCurrentUser } from "@/lib/current-user";
import { notFound } from "next/navigation";

const INTERNAL_USER_IDS_ENV = "INTERNAL_USER_IDS";

export function parseInternalUserIds(value = process.env[INTERNAL_USER_IDS_ENV]) {
  return new Set(
    (value || "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

export async function getCurrentInternalUser() {
  const user = await getCurrentUser();

  if (!user || !parseInternalUserIds().has(user.id)) {
    return null;
  }

  return user;
}

export async function requireInternalRouteAccess() {
  const user = await getCurrentInternalUser();

  if (!user) {
    notFound();
  }

  return user;
}
