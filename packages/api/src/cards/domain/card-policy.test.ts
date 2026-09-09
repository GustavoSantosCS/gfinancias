import { describe, expect, it } from "vite-plus/test";

import { normalizeCardName } from "./card-policy";

describe("card policy", () => {
    it("keeps a display name while creating a locale-aware uniqueness key", () => {
        expect(normalizeCardName("  Meu   CARTÃO ")).toEqual({
            displayName: "Meu CARTÃO",
            normalizedName: "meu cartão",
        });
    });
});
