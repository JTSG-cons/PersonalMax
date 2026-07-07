import { redirect } from "next/navigation";
import { MobileTabBar, MobileTopBar, Sidebar } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

// Shell for every authenticated page: desktop sidebar + mobile tab bar.
// The proxy already gates these routes; this is the defense-in-depth check.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? "you";

  return (
    <div className="flex min-h-screen">
      <Sidebar username={username} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar username={username} />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
