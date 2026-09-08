import { describe, expect, it } from "vite-plus/test";

import { assertPhaseIsValid } from "./rules";

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

    it("rejects an overlapping phase", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 20, startDay: 10 },
                existing: [{ endDay: 15, startDay: 1 }],
                month: 2,
                year: 2028,
            }),
        ).toThrow("Phase dates cannot overlap");
    });

    it("rejects a day that does not exist in the selected month", () => {
        expect(() =>
            assertPhaseIsValid({
                candidate: { endDay: 30, startDay: 1 },
                existing: [],
                month: 2,
                year: 2027,
            }),
        ).toThrow("Phase dates must be within the selected month");
    });
});
