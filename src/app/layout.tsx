import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Import Outfit font
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const outfit = Outfit({ subsets: ["latin"] }); // Configure it

export const metadata: Metadata = {
  title: "Collabio - Organize Your Flow",
  description: "The visual workspace for references and collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${outfit.className} bg-[#F2F2F0] text-[#1c1917] antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}