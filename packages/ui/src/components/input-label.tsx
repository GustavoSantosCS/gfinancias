import { cn } from "@gfinancias/ui/lib/utils";
import * as React from "react";

function InputLabel({
    children,
    className,
    required = false,
    ...props
}: React.ComponentProps<"span"> & { required?: boolean }) {
    return (
        <span
            data-slot="input-label"
            className={cn("modal-input-label text-[10px] leading-none font-bold", className)}
            {...props}
        >
            {children}
            {required && (
                <span aria-hidden="true" className="ml-0.5 text-red-600">
                    *
                </span>
            )}
        </span>
    );
}

export { InputLabel };
