import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@gfinancias/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
    "group/button inline-flex min-h-[38px] shrink-0 items-center justify-center gap-[7px] rounded-[10px] border px-[15px] text-[11px] font-bold whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                primary: "button--primary primary-button",
                default: "button--default secondary-button",
                danger: "button--danger primary-button border-[#b91c1c] bg-[#dc2626] text-white shadow-[0_8px_22px_rgb(220_38_38_/_22%)] hover:bg-[#b91c1c] hover:-translate-y-px",
                warning:
                    "button--warning primary-button border-0 bg-[#ca8a04] text-white shadow-[0_8px_22px_rgb(202_138_4_/_22%)] hover:bg-[#a16207] hover:-translate-y-px",
                outline:
                    "button--default border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] hover:-translate-y-px",
                secondary:
                    "button--default border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] hover:-translate-y-px",
                ghost: "border-transparent bg-transparent text-current hover:bg-black/10",
                destructive:
                    "button--danger primary-button border-[#b91c1c] bg-[#dc2626] text-white shadow-[0_8px_22px_rgb(220_38_38_/_22%)] hover:bg-[#b91c1c] hover:-translate-y-px",
                link: "border-transparent bg-transparent text-[var(--green-dark)] underline-offset-4 hover:underline",
            },
            size: {
                default: "",
                xs: "min-h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
                sm: "min-h-7 gap-1 rounded-md px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
                lg: "min-h-9",
                icon: "size-8 min-h-0 rounded-full p-0",
                "icon-xs": "size-6 min-h-0 rounded-full p-0 [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7 min-h-0 rounded-full p-0",
                "icon-lg": "size-9 min-h-0 rounded-full p-0",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    },
);

function Button({
    className,
    variant = "primary",
    size = "default",
    ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
    return (
        <ButtonPrimitive
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
