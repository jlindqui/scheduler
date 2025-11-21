// lib/auth-protection-plugin.ts
import { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { NextRequest, NextResponse } from "next/server";

export const routeProtectionPlugin = () => {
  return {
    id: "route-protection",
    middlewares: [
      {
        path: "*", // Apply to all routes
        middleware: createAuthMiddleware(async (ctx) => {
          const request = ctx.request as NextRequest;
          const session = ctx.context.session;

          // Replicate your exact NextAuth authorized callback logic
          const isLoggedIn = !!session?.user;
          const isOnProduct = request.nextUrl.pathname.startsWith("/product");
          const isOnAdmin = request.nextUrl.pathname.startsWith("/product/admin");

          // If trying to access admin page, check for admin role
          if (isOnAdmin) {
            const isAdmin = session?.user?.organization?.members?.some(
              (member: { role: string; userId: string }) =>
                member.role === "Admin" && member.userId === session.user.id
            );

            // Return false equivalent - redirect to login
            if (!(isLoggedIn && isAdmin)) {
              return NextResponse.redirect(new URL("/login", request.url));
            }
          }

          // If on product and not logged in, return false equivalent
          if (isOnProduct && !isLoggedIn) {
            return NextResponse.redirect(new URL("/login", request.url));
          }

          // Return true equivalent - allow request to continue
          return;
        }),
      },
    ],
  } satisfies BetterAuthPlugin;
};
