"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Check } from "lucide-react";

export function Toast() {
  const { toast, setToast } = useStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-tt-dark text-white font-mono text-[12px] tracking-wide px-4 py-2.5 flex items-center gap-2 shadow-lg pointer-events-auto"
          >
            <Check size={14} className="text-tt-ok" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
