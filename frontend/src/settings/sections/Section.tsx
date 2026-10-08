import type { ReactNode } from 'react'

// The title row is as tall as the sidebar title and the close button, so all three line up.
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-0.5">
      <div className="flex h-8 items-center justify-between gap-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
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
