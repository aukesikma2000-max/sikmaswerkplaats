'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDisplayRepairNumber } from '@/lib/repair-display';
import { searchRepairs } from '@/lib/repair-service';
import type { Repair } from '@/types/repair';

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

type GlobalRepairSearchProps = {
  placeholder?: string;
  className?: string;
  inputWrapperClassName?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  autoOpenSingleResult?: boolean;
};

export function GlobalRepairSearch({
  placeholder = 'Zoek klant, telefoon, reparatienummer of omschrijving',
  className,
  inputWrapperClassName,
  inputClassName,
  dropdownClassName,
  autoOpenSingleResult = false,
}: GlobalRepairSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoOpenedRef = useRef<string>('');
  const debouncedQuery = useDebouncedValue(query, 140);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    async function runSearch() {
      const trimmed = debouncedQuery.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await searchRepairs(trimmed);
        if (!active) return;
        setResults(data.slice(0, 8));
      } catch {
        if (!active) return;
        setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    runSearch();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const showDropdown = useMemo(() => {
    if (!open) return false;
    if (query.trim().length < 2) return false;
    return true;
  }, [open, query]);

  useEffect(() => {
    if (!autoOpenSingleResult) return;
    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery.length < 2) return;
    if (loading) return;
    if (results.length !== 1) return;

    const onlyResult = results[0];
    const key = `${normalizedQuery}:${onlyResult.id}`;
    if (autoOpenedRef.current === key) return;

    autoOpenedRef.current = key;
    setOpen(false);
    setQuery('');
    router.push(`/reparaties/${encodeURIComponent(onlyResult.id)}`);
  }, [autoOpenSingleResult, debouncedQuery, loading, results, router]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <label className={`flex items-center gap-4 rounded-[20px] border-2 border-slate-300 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(17,17,17,0.04)] ${inputWrapperClassName ?? ''}`}>
        <span className="text-2xl">🔎</span>
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className={`w-full bg-transparent text-xl font-medium text-slate-900 outline-none ${inputClassName ?? ''}`}
          placeholder={placeholder}
        />
      </label>

      {showDropdown ? (
        <div className={`absolute z-30 mt-2 w-full rounded-[16px] border border-slate-200 bg-white p-2 shadow-[0_16px_30px_rgba(17,17,17,0.12)] ${dropdownClassName ?? ''}`}>
          {loading ? <p className="px-3 py-2 text-sm text-slate-500">Zoeken...</p> : null}

          {!loading && !results.length ? <p className="px-3 py-2 text-sm text-slate-500">Geen reparaties gevonden.</p> : null}

          {!loading
            ? results.map((repair) => (
                <button
                  key={repair.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    router.push(`/reparaties/${encodeURIComponent(repair.id)}`);
                  }}
                  className="flex w-full items-start justify-between rounded-[12px] px-3 py-2 text-left transition hover:bg-[#F8F8F8]"
                >
                  <div>
                    <p className="font-semibold text-[#111111]">{repair.customer}</p>
                    <p className="text-sm text-slate-600">{getDisplayRepairNumber(repair)} · {repair.brand} {repair.model}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{repair.status}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
