type SearchBarProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ placeholder, value, onChange }: SearchBarProps) {
  return (
    <label className="flex items-center gap-3 rounded-[16px] border border-slate-300 bg-white px-4 py-3">
      <span className="text-xl">🔎</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-base text-slate-800 outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}
