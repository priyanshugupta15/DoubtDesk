import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Provider } from "./provider";



const AppFont = DM_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-app',
})
export const metadata: Metadata = {
  title: "DoubtDesk - AI Doubt Solver",
  description: "DoubtDesk is your personal AI career wingman. From resume analysis to custom learning roadmaps, we provide the tools you need to level up your professional life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={AppFont.className}
        >
          <Provider>
            {children}

          </Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
