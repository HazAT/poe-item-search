import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const baseInputClasses = `
  w-full px-3 py-2
  bg-poe-black border border-poe-gray-alt rounded
  text-poe-beige font-body text-sm
  placeholder:text-poe-gray-alt
  focus:outline-none focus:border-poe-gold focus:ring-1 focus:ring-poe-gold
  disabled:opacity-50 disabled:cursor-not-allowed
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-poe-beige mb-1 font-fontin">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseInputClasses} ${error ? "border-poe-red" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-poe-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-poe-beige mb-1 font-fontin">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${baseInputClasses} resize-none ${error ? "border-poe-red" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-poe-red">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
