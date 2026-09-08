"use client";

import { Button } from "@gfinancias/ui/components/button";
import { cn } from "@gfinancias/ui/lib/utils";
import { useEffect, type ReactNode } from "react";

function Dialog({
    children,
    className,
    onClose,
    title,
}: {
    children: ReactNode;
    className?: string;
    onClose: () => void;
    title: string;
}) {
    useEffect(() => {
        const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", close);
        return () => window.removeEventListener("keydown", close);
    }, [onClose]);

    return (
        <div
            className="modal-backdrop"
            onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
            <section
                aria-label={title}
                aria-modal="true"
                className={cn("modal", className)}
                role="dialog"
            >
                <div className="modal__header">
                    <h2>{title}</h2>
                    <Button
                        aria-label="Fechar"
                        className="icon-button"
                        onClick={onClose}
                        size="icon"
                        type="button"
                        variant="ghost"
                    >
                        ×
                    </Button>
                </div>
                {children}
            </section>
        </div>
    );
}

export { Dialog };
