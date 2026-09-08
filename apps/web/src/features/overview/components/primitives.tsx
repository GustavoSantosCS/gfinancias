import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
    title,
    children,
    onClose,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
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
            <section aria-label={title} aria-modal="true" className="modal" role="dialog">
                <div className="modal__header">
                    <div>
                        <span className="eyebrow">Planejamento mensal</span>
                        <h2>{title}</h2>
                    </div>
                    <button
                        aria-label="Fechar"
                        className="icon-button"
                        onClick={onClose}
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </div>
                {children}
            </section>
        </div>
    );
}

export function Field({
    children,
    label,
    htmlFor,
}: {
    children: ReactNode;
    label: string;
    htmlFor: string;
}) {
    return (
        <label className="field" htmlFor={htmlFor}>
            <span>{label}</span>
            {children}
        </label>
    );
}
export function Progress({
    value,
    tone = "green",
}: {
    value: number;
    tone?: "green" | "violet" | "coral";
}) {
    return (
        <div aria-label={Math.round(value) + "% concluído"} className="progress">
            <span
                className={"progress__fill progress__fill--" + tone}
                style={{ width: Math.min(value, 100) + "%" }}
            />
        </div>
    );
}
