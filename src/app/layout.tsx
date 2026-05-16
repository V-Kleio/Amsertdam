"use client";
import "./globals.css";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up"]);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_PATHS.has(pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 768);
  }, []);

  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased relative ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
          }`}
      >
        <Toaster />
        <QueryProvider>
          {isPublicRoute ? (
            children
          ) : (
            <div className="flex min-h-screen flex-col md:flex-row">
              {isSidebarOpen && (
                <button
                  aria-label="Close sidebar"
                  className="fixed inset-0 z-40 bg-black/40 md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}
              <Sidebar
                className="md:w-1/4"
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen((prev) => !prev)}
                onClose={() => setIsSidebarOpen(false)}
              />
              <div className="flex-1 flex flex-col">
                <Navbar
                  className="w-full"
                  onOpenSidebar={() => setIsSidebarOpen(true)}
                />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          )}
        </QueryProvider>
      </body>
    </html>
  );
}
