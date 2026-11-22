import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TFT Friends Ladder",
  description: "A private Teamfight Tactics ranked leaderboard for friends.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
