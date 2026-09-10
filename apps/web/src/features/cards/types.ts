import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { z } from "zod";
import type { cardSchema } from "./schemas/card-form";

import type { AppRouter } from "@gfinancias/api/routers/index";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type Card = RouterOutputs["cards"]["list"][number];
export type CardBrand = NonNullable<Card["brand"]>;
export type PurchaseEntry = RouterOutputs["cards"]["listPurchases"][number];
export type PurchaseDetail = RouterOutputs["cards"]["getPurchase"];
type ValidatedInput<Input, Validated> = unknown extends Input ? Validated : Input;
export type CardInput = ValidatedInput<
    RouterInputs["cards"]["create"],
    z.output<typeof cardSchema>
>;
export type CardUpdateInput = ValidatedInput<
    RouterInputs["cards"]["update"],
    z.output<typeof cardSchema> & { id: string }
>;
export type PurchaseInput = RouterInputs["cards"]["createPurchase"];
export type PurchaseUpdateInput = RouterInputs["cards"]["updatePurchase"];
export type AnticipationInput = RouterInputs["cards"]["anticipate"];
export type PurchaseStatus = "ALL" | "ACTIVE" | "ARCHIVED";
export type AnticipationMode = AnticipationInput["mode"];

export type Period = { month: number; year: number };
export type CardFormError = Record<string, string>;
