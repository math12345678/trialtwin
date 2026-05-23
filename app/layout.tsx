import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Toast } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "TrialTwin — Clinical Trial Representation Simulator",
  description:
    "Stress-test demographic and geographic representation of a planned clinical trial before recruitment begins. Built on a scientometric audit of 98 NCCN-cited RCC studies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body bg-tt-bg text-tt-text">
        <header className="border-b border-tt-border bg-tt-bg">
          <div className="mx-auto max-w-tt-container px-6 md:px-12 flex items-center justify-between py-5">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <span
                aria-hidden
                className="inline-block w-2 h-2 bg-tt-accent"
              />
              <span className="font-mono text-[12px] tracking-[0.18em] uppercase">
                TrialTwin
              </span>
              <span className="hidden md:inline font-mono text-[10px] tracking-widest text-tt-faint">
                v1.0 · RESEARCH PROTOTYPE
              </span>
            </Link>
            <nav className="flex items-center gap-6 font-mono text-[11px] tracking-widest uppercase text-tt-muted">
              <Link href="/simulate" className="hover:text-tt-text transition-colors">
                Simulate
              </Link>
              <Link href="/audit" className="hover:text-tt-text transition-colors">
                Audit Data
              </Link>
              <Link href="/about" className="hover:text-tt-text transition-colors">
                About
              </Link>
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-180px)]">{children}</main>
        <Toast />

        <footer className="border-t border-tt-border bg-tt-bg-alt mt-24">
          <div className="mx-auto max-w-tt-container px-6 md:px-12 py-10 grid md:grid-cols-3 gap-6 text-[12px] text-tt-muted">
            <div>
              <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
                Project
              </div>
              <p className="leading-snug">
                TrialTwin simulates the demographic composition of planned clinical
                trials based on historical publication patterns. It does not
                predict clinical outcomes.
              </p>
            </div>
            <div>
              <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
                Audit foundation
              </div>
              <p className="leading-snug">
                Reddy S., Kang B., Celi L.A. et al. Scientometric audit of NCCN
                Kidney Cancer Guidelines, v3.2022. MIT Critical Data Laboratory
                for Computational Physiology.
              </p>
            </div>
            <div>
              <div className="font-mono uppercase text-[10px] tracking-widest text-tt-faint mb-2">
                Disclaimers
              </div>
              <p className="leading-snug">
                Outputs are illustrative simulations, not clinical predictions.
                Not for use in IRB submission or trial protocol design.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
