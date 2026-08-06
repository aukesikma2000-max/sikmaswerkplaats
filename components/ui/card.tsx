import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.04)] ${className}`}>{children}</div>;
}
