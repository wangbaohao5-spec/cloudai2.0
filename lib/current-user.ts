import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const session = await auth();
  const sessionUser = session?.user;
  const email = sessionUser?.email?.trim().toLowerCase();

  if (!sessionUser || !email) {
    return null;
  }

  return db.user.upsert({
    where: {
      email,
    },
    update: {
      name: sessionUser.name || email.split("@")[0] || "CloudAI User",
      image: sessionUser.image || null,
    },
    create: {
      email,
      name: sessionUser.name || email.split("@")[0] || "CloudAI User",
      image: sessionUser.image || null,
    },
  });
}
