import { cn } from "@gfinancias/ui/lib/utils";
import * as React from "react";

function Select({ className, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            data-slot="select"
            className={cn(
                "modal-select h-[43px] w-full rounded-[10px] border border-[var(--line,#e4e9e5)] bg-[var(--surface-2,#f7f8f6)] px-3 text-xs text-[var(--ink,#17211d)] outline-none transition-colors focus-visible:border-[var(--green,#2fcf8e)] focus-visible:shadow-[0_0_0_3px_rgb(47_207_142_/_12%)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { Select };
