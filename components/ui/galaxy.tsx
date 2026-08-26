"use client";

export function Galaxy({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div className="aurora-bg absolute -top-1/2 left-1/2 h-[900px] w-[1200px] -translate-x-1/2 rounded-full opacity-[0.07]" style={{ background: `radial-gradient(600px circle at 30% 30%, #FFB43A, transparent 70%), radial-gradient(700px circle at 70% 60%, #E4532A, transparent 70%), radial-gradient(500px circle at 50% 80%, #2EB97A, transparent 70%)`, filter: "blur(40px)" }} />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #0F1115 1px, transparent 0)`, backgroundSize: "22px 22px" }} />
    </div>
  );
}
