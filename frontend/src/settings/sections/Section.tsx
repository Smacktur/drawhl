import type { ReactNode } from 'react'

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="text-muted-foreground text-[13px]">{description}</p>
    </header>
  )
}

/** A titled group of fields inside a section. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t pt-5">
      <legend className="float-left mb-1 w-full font-medium">{title}</legend>
      {children}
    </fieldset>
  )
}
