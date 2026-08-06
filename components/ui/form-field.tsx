type FormFieldProps = {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
};

export function FormField({ label, value, onChange, placeholder, required = false, multiline = false, type = 'text' }: FormFieldProps) {
  const common = 'w-full rounded-[16px] border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-[#D4AF37]';

  return (
    <label className="block text-left">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-[#D4AF37]">*</span> : null}
      </span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className={`${common} min-h-[120px] resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className={common} />
      )}
    </label>
  );
}
