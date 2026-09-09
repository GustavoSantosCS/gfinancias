import type { CardFormError } from "../types";

export type FormResult<T> = { success: true; data: T } | { success: false; errors: CardFormError };

export function issuesToErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
    return issues.reduce<CardFormError>((errors, issue) => {
        const field = String(issue.path[0] ?? "form");
        if (!errors[field])
            errors[field] =
                /[áàãâéêíóôõúç]/i.test(issue.message) ||
                issue.message.startsWith("Informe") ||
                issue.message.startsWith("Escolha")
                    ? issue.message
                    : "Informe um valor válido para este campo.";
        return errors;
    }, {});
}
