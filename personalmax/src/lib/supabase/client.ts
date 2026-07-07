"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Used only for reading the user's own data in
// client components; all mutations go through the app's API routes.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
