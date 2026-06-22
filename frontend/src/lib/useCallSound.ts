"use client";

import { useRef, useCallback, useEffect } from "react";

let sharedCtx: AudioContext | null = null;
let sharedGain: GainNode | null = null;
let initDone = false;

function init() {
  if (initDone) return;
  initDone = true;
  const handler = () => {
    if (sharedCtx?.state === "suspended") sharedCtx.resume();
  };
  document.addEventListener("click", handler, { once: true });
  document.addEventListener("touchstart", handler, { once: true });
}

function getCtx(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
    sharedGain = sharedCtx.createGain();
    sharedGain.gain.value = 0.3;
    sharedGain.connect(sharedCtx.destination);
    init();
  }
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

export function useCallSound() {
  const oscRef = useRef<OscillatorNode[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    try {
      const ctx = getCtx();
      stop();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.value = 0.3;
      g2.gain.value = 0.3;
      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(sharedGain!);
      g2.connect(sharedGain!);
      osc1.start();
      osc2.start();
      oscRef.current = [osc1, osc2];

      let on = true;
      const pattern = () => {
        g1.gain.value = on ? 0.3 : 0;
        g2.gain.value = on ? 0.3 : 0;
        on = !on;
        timeoutRef.current = setTimeout(pattern, on ? 400 : 200);
      };
      timeoutRef.current = setTimeout(pattern, 400);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    oscRef.current.forEach((o) => { try { o.stop(); } catch {} });
    oscRef.current = [];
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { playRingtone: play, stopRingtone: stop };
}
