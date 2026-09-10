import type { CardFormError } from "../types";

export function FormErrors({ errors }: { errors: CardFormError }) {
    return (
        <>
            {Object.entries(errors).map(([field, message]) => (
                <p id={field + "-error"} key={field} role="alert">
                    {message}
                </p>
            ))}
        </>
    );
}
