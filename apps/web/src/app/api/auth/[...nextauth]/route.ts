import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// next-auth v4 types its options-only overload as returning `any`.
// We cast through `unknown` so the type is explicit and `any` does not
// propagate into the exported GET / POST handlers.
const handler = NextAuth(authOptions) as unknown as (...args: unknown[]) => Promise<Response>;

export { handler as GET, handler as POST };
