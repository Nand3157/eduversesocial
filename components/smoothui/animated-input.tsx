"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const LABEL_TRANSITION = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

interface AnimatedInputProps {
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
  label: string;
  labelClassName?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  value?: string;
}

// Adapted from SmoothUI's AnimatedInput (MIT): the label floats up into a
// small accent chip when the field is focused or filled. Uses framer-motion
// and the app's own tokens instead of the smoothui registry ones.
export function AnimatedInput({
  value,
  defaultValue = "",
  onChange,
  label,
  placeholder = "",
  disabled = false,
  type = "text",
  className = "",
  inputClassName = "",
  labelClassName = "",
  icon
}: AnimatedInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const val = isControlled ? value : internalValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = !!val || isFocused;
  const shouldReduceMotion = useReducedMotion();
  const reactId = useId();
  const inputId = `animated-input-${reactId.replace(/:/g, "")}`;

  return (
    <div className={`relative flex items-center ${className}`}>
      {icon ? (
        <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2">
          {icon}
        </span>
      ) : null}
      <input
        aria-label={label}
        className={`peer h-10 w-full rounded-full border border-borderSoft bg-surface pl-10 pr-4 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faintText focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${inputClassName}`}
        disabled={disabled}
        id={inputId}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          if (!isControlled) setInternalValue(event.target.value);
          onChange?.(event.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        placeholder={isFloating ? placeholder : ""}
        ref={inputRef}
        type={type}
        value={val}
      />
      <motion.label
        animate={
          shouldReduceMotion
            ? undefined
            : isFloating
              ? { color: "var(--accent)", scale: 0.78, x: -4, y: -26 }
              : { color: "var(--faint)", scale: 1, x: 0, y: 0 }
        }
        className={`pointer-events-none absolute left-10 top-1/2 z-[2] -translate-y-1/2 origin-left truncate rounded-full bg-surface px-1.5 text-xs text-faintText ${labelClassName}`}
        htmlFor={inputId}
        style={
          shouldReduceMotion
            ? isFloating
              ? { color: "var(--accent)", transform: "translate(-4px, -26px) scale(0.78)" }
              : { color: "var(--faint)", transform: "none" }
            : undefined
        }
        transition={shouldReduceMotion ? { duration: 0 } : LABEL_TRANSITION}
      >
        {label}
      </motion.label>
    </div>
  );
}