import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/register-sw";

export const metadata: Metadata = {
  title: {
    default: "PersonalMax",
    template: "%s · PersonalMax",
  },
  description:
    "Log workouts, follow your plan, fuel up, and level a character built from your real training.",
  applicationName: "PersonalMax",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PersonalMax",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
