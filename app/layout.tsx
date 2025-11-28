// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TENtion",
  description: "TENtion Mini App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* 여기 한 박스가 ‘폰 화면’ 역할 */}
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
