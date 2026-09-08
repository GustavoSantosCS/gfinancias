import { describe, expect, it } from "vite-plus/test";

import { InvalidPhaseError } from "./errors";
import { assertPhaseIsValid } from "./phase-policy";

describe("assertPhaseIsValid", () => {
    it("accepts a phase inside the selected month without overlap", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 15, startDay: 1 },
                existing: [{ endDay: 31, startDay: 16 }],
                month: 2,
                year: 2028,
            }),
        ).not.toThrow();
    });

    it("rejects a phase that overlaps at the start boundary", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 20, startDay: 10 },
                existing: [{ endDay: 15, startDay: 1 }],
                month: 2,
                year: 2028,
            }),
        ).toThrowError(new InvalidPhaseError("Phase dates cannot overlap"));
    });

    it("rejects a phase that overlaps at the end boundary", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 10, startDay: 1 },
                existing: [{ endDay: 20, startDay: 10 }],
                month: 2,
                year: 2028,
            }),
        ).toThrowError(new InvalidPhaseError("Phase dates cannot overlap"));
    });

    it("accepts adjacent phases without overlap", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 10, startDay: 1 },
                existing: [{ endDay: 28, startDay: 11 }],
                month: 2,
                year: 2028,
            }),
        ).not.toThrow();
    });

    it.each([
        ["a day before the selected month", { endDay: 10, startDay: 0 }, 3, 2028],
        ["an inverted interval", { endDay: 10, startDay: 11 }, 3, 2028],
        ["a day after the selected month", { endDay: 32, startDay: 1 }, 3, 2028],
        ["February 29 in a non-leap year", { endDay: 29, startDay: 1 }, 2, 2027],
    ])("rejects %s", (_description, candidate, month, year) => {
        expect(() =>
            assertPhaseIsValid({
                candidate,
                existing: [],
                month,
                year,
            }),
        ).toThrowError(new InvalidPhaseError("Phase dates must be within the selected month"));
    });

    it("accepts February 29 in a leap year", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 29, startDay: 1 },
                existing: [],
                month: 2,
                year: 2028,
            }),
        ).not.toThrow();
    });
});
