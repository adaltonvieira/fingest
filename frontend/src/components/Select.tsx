import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

/**
 * Dropdown customizado para substituir o <select> nativo do navegador.
 * O <select> nativo delega a renderização da lista aberta ao sistema
 * operacional, o que impede controlar sua aparência via CSS (problema real
 * observado no Windows/Chrome: texto ilegível no tema escuro). Este
 * componente desenha a lista inteiramente em HTML/React, sob nosso controle.
 *
 * Inclui um <input type="hidden"> com o mesmo `name`/`value` para permanecer
 * compatível com formulários que leem dados via FormData.
 */
export default function Select({ name, value, onChange, options, placeholder, required }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!open && buttonRef.current) {
      // Decide se a lista deve abrir para baixo (padrão) ou para cima,
      // dependendo de quanto espaço sobra até a borda da tela/modal.
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedListHeight = Math.min(options.length * 40 + 8, 224); // max-h-56 ≈ 224px
      setOpenUpward(spaceBelow < estimatedListHeight && rect.top > estimatedListHeight);
    }
    setOpen((o) => !o);
  }

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-left text-slate-900 dark:text-slate-100"
      >
        <span className={selected ? '' : 'text-slate-400'}>
          {selected ? selected.label : placeholder ?? 'Selecione...'}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222b] shadow-lg py-1 ${
            openUpward ? 'bottom-full mb-1' : 'mt-1'
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {o.label}
              {o.value === value && <Check size={14} className="text-brand-600 shrink-0" />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">Nenhuma opção disponível</div>
          )}
        </div>
      )}
    </div>
  );
}
