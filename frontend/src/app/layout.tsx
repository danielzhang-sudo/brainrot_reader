import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brainrot Reader",
  description: "Dynamic RSVP & TTS Mobile Stream Reader",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Forces background video to fill around notches
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-dvh overflow-hidden select-none">
      <body className="bg-black text-white h-dvh antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}