import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const baseSelectClasses = `
  w-full px-3 py-2
  bg-poe-black border border-poe-gray-alt rounded
  text-poe-beige font-body text-sm
  focus:outline-none focus:border-poe-gold focus:ring-1 focus:ring-poe-gold
  disabled:opacity-50 disabled:cursor-not-allowed
  cursor-pointer
`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-poe-beige mb-1 font-fontin">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`${baseSelectClasses} ${error ? "border-poe-red" : ""} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-poe-red">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
