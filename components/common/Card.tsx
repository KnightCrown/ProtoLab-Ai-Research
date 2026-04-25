import { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      {title ? <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3> : null}
      {children}
    </section>
  );
}
