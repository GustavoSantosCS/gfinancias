import { Input } from "@gfinancias/ui/components/input";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { cn } from "@gfinancias/ui/lib/utils";
import * as React from "react";

function FieldInput({
    className,
    id,
    label,
    required = false,
    ...props
}: React.ComponentProps<typeof Input> & {
    label: string;
    required?: boolean;
}) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
        <div className={cn("grid gap-[7px]", className)} data-slot="field-input">
            <Label htmlFor={inputId}>
                <InputLabel required={required}>{label}</InputLabel>
            </Label>
            <Input id={inputId} required={required} {...props} />
        </div>
    );
}

export { FieldInput };
