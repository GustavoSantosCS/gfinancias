import { describe, expect, it } from "vite-plus/test";

import {
    ExpenseNotFoundError,
    IncomeNotFoundError,
    InvalidPhaseError,
    PhaseContainsRecordsError,
    PhaseNotFoundError,
} from "./errors";

describe("planning domain errors", () => {
    it("preserves the custom message and error name for invalid phases", () => {
        const error = new InvalidPhaseError("Phase dates cannot overlap");

        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({
            message: "Phase dates cannot overlap",
            name: "InvalidPhaseError",
        });
    });

    it.each([
        [PhaseNotFoundError, "Phase was not found", "PhaseNotFoundError"],
        [IncomeNotFoundError, "Income was not found", "IncomeNotFoundError"],
        [ExpenseNotFoundError, "Expense was not found", "ExpenseNotFoundError"],
        [
            PhaseContainsRecordsError,
            "A phase with records cannot be deleted",
            "PhaseContainsRecordsError",
        ],
    ])("describes %s with a stable message", (ErrorClass, message, name) => {
        const error = new ErrorClass();

        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({ message, name });
    });
});
