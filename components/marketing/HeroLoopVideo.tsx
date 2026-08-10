"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient, silent, looping hero video. Autoplays muted (the only autoplay
 * browsers allow), but stays accessible:
 *  - respects prefers-reduced-motion (starts paused on the poster)
 *  - always offers a pause/play control (WCAG 2.2.2 — auto-playing motion
 *    longer than 5s must be pausable; a loop runs indefinitely)
 * `playing` is driven by the element's own play/pause events, so there's no
 * setState inside the effect.
 */
export default function HeroLoopVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.pause();
    } else {
      void v.play().catch(() => {});
    }
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ring-1 ring-white/10 ${className ?? ""}`}>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="aspect-[9/16] w-full bg-warm-950 object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause video" : "Play video"}
        className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
