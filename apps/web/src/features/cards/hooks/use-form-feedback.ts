import { useState } from "react";
import type { FormResult } from "../schemas/form-result";
import type { CardFormError } from "../types";

export function useFormFeedback() {
    const [errors, setErrors] = useState<CardFormError>({});
    const [submitting, setSubmitting] = useState(false);
    function reject(next: CardFormError, form: HTMLFormElement) {
        setErrors(next);
        const name = Object.keys(next)[0];
        const field = Array.from(form.elements).find(
            (element) => element.getAttribute("name") === name,
        );
        if (field instanceof HTMLElement) field.focus();
    }
    async function submit<T>(
        result: FormResult<T>,
        form: HTMLFormElement,
        callback: (input: T) => Promise<void> | void,
    ) {
        if (submitting) return;
        if (!result.success) {
            reject(result.errors, form);
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await callback(result.data);
        } catch (error) {
            setErrors({
                form:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível salvar. Tente novamente.",
            });
        } finally {
            setSubmitting(false);
        }
    }
    async function run(callback: () => Promise<void> | void) {
        if (submitting) return;
        setErrors({});
        setSubmitting(true);
        try {
            await callback();
        } catch (error) {
            setErrors({
                form:
                    error instanceof Error
                        ? error.message
                        : "Não foi possível salvar. Tente novamente.",
            });
        } finally {
            setSubmitting(false);
        }
    }
    function field(name: string) {
        return {
            "aria-invalid": Boolean(errors[name]),
            "aria-describedby": errors[name] ? name + "-error" : undefined,
        };
    }
    return { errors, field, reject, run, submit, submitting };
}
