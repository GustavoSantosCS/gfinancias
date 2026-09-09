import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@gfinancias/ui/lib/utils";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <InputPrimitive
            type={type}
            data-slot="input"
            className={cn(
                "modal-input h-[43px] w-full min-w-0 rounded-[10px] border border-[var(--line,#e4e9e5)] bg-[var(--surface-2,#f7f8f6)] px-3 text-xs text-[var(--ink,#17211d)] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[var(--green,#2fcf8e)] focus-visible:shadow-[0_0_0_3px_rgb(47_207_142_/_12%)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20",
                className,
            )}
            {...props}
        />
    );
}

export { Input };
