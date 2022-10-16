import { redirect } from "@remix-run/node";
import Service from "~/services.server";
import { authenticator } from "./auth.server";

export async function getUserId(request: Request): Promise<string | undefined> {
  let authUser = await authenticator.isAuthenticated(request);
  return authUser?.userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await Service.userRepository.getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireUserId(request: Request, redirectTo?: string) {
  const userId = await getUserId(request);
  if (!userId) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo ?? `${url.pathname}${url.search}`],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);

  const user = await Service.userRepository.getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function logout(request: Request) {
  return redirect("/logout");
}
