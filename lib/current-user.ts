import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cache } from "react";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id?.trim();

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  return user?.isActive ? user : null;
});
