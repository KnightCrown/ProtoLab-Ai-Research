import { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-[#d6d2c1] bg-[#fffdf6] p-5 shadow-sm ${className}`}
    >
      {title ? <h3 className="mb-3 text-sm font-semibold text-[#4d5445]">{title}</h3> : null}
      {children}
    </section>
  );
}
