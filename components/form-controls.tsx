"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground/90 leading-none"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
    </div>
  )
}

const inputBase =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"

export function NumberInput({
  id,
  value,
  onChange,
  min = 0,
  max,
  step = "any",
  placeholder,
  prefix,
  suffix,
  disabled,
}: {
  id?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number | "any"
  placeholder?: string
  prefix?: string
  suffix?: string
  disabled?: boolean
}) {
  return (
    <div className="relative flex items-center">
      {prefix ? (
        <span className="pointer-events-none absolute left-3 text-sm font-medium text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === "" ? 0 : Number.parseFloat(v))
        }}
        className={cn(
          inputBase,
          prefix && "pl-9",
          suffix && "pr-9",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(inputBase, "cursor-pointer appearance-none pr-9")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
