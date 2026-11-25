"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, X } from "lucide-react";

export interface VideoModalData {
  video_id: string;
  title: string;
  channel_name: string;
  duration?: string;
}

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoModalData | null;
}

export function TrailerModal({ isOpen, onClose, video }: TrailerModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && video && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-zinc-glass shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2.5 pr-4">
                <Film className="h-4 w-4 shrink-0 text-emerald" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                    {video.title}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {video.channel_name}
                    {video.duration ? ` · ${video.duration}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close player"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-zinc-900 p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
