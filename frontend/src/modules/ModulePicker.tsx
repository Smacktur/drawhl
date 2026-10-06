import { MODULES } from '@/modules/registry'

/** Gallery of every registered module; picking one adds it to the board. */
export function ModulePicker({ onPick }: { onPick: (kind: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground px-2 pt-1 text-[13px]">Modules</p>
      {MODULES.map(({ kind, name, description, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onPick(kind)}
          className="hover:bg-accent focus-visible:bg-accent flex items-start gap-3 rounded-md p-2 text-left outline-none"
        >
          <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="flex flex-col">
            <span className="text-[14px] font-medium">{name}</span>
            <span className="text-muted-foreground text-[13px]">{description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
