/**
 * Module: Select
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Theme-tokened native select, used by FilterBar's unit/level/kind/venue
 *          dropdowns. No hardcoded colors — uses CSS variable tokens only.
 */
export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
}

export function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--fg-primary)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
