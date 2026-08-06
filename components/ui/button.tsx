import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'w-full rounded-[16px] px-5 py-3 text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#D4AF37]';
  const variants = {
    primary: 'bg-[#111111] text-white hover:bg-slate-800',
    secondary: 'bg-[#D4AF37] text-[#111111] hover:bg-[#c59f2f]',
    ghost: 'border border-slate-300 bg-white text-[#111111] hover:bg-slate-50',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
