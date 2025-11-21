import { headers } from "next/headers";
import { auth } from "./auth";
import { ExtendedSessionUser } from "./types";

export async function getServerSession() {
  const headersList = await headers();

  const session = (await auth.api.getSession({
    headers: headersList,
  })) as { user: ExtendedSessionUser } | null;
  return session;
}
