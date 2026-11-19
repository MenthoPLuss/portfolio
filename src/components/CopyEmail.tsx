"use client";

import { useRef, useState } from "react";
import { sfx } from "@/lib/store";

export function CopyEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<"" | "ok" | "fail">("");
  const timer = useRef<number>(0);
  const copy = async () => {
    window.clearTimeout(timer.current);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // legacy fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setStatus(ok ? "ok" : "fail");
    if (ok) sfx("confirm");
    timer.current = window.setTimeout(() => setStatus(""), 4000);
  };
  return (
    <div className="copy-row">
      <button type="button" className="pill" data-magnetic onClick={copy}>
        <span className="mag">Copy email</span>
      </button>
      <p className="copy-status" role="status" aria-live="polite" data-state={status}>
        {status === "ok" ? "Email copied to clipboard." : status === "fail" ? `Couldn’t copy. Select the address above: ${email}` : ""}
      </p>
    </div>
  );
}
