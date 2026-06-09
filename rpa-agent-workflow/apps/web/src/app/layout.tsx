import type { Metadata } from "next";
import { THEME_BOOT_SCRIPT, Toaster } from "@aientry/ui-components";
import "../styles.css";

export const metadata: Metadata = {
  title: "RPA Agent Workflow",
  description: "Workflow editor for RPA agent blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script id="theme-boot" dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body data-app="rpa-workflow">
        {children}
        <Toaster position="top-center" expand visibleToasts={4} />
      </body>
    </html>
  );
}
