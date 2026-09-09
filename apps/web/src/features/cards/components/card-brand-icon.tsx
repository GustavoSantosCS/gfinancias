import type { ComponentType, SVGProps } from "react";
import { CreditCard } from "lucide-react";
import {
    AmericanExpress,
    Elo,
    Hipercard,
    Mastercard,
    Visa,
} from "react-svg-credit-card-payment-icons/icons/logo";

import type { CardBrand } from "../types";
import { brandLabels } from "../utils/card-display";

const icons: Record<Exclude<CardBrand, "OTHER">, ComponentType<SVGProps<SVGSVGElement>>> = {
    AMERICAN_EXPRESS: AmericanExpress,
    ELO: Elo,
    HIPERCARD: Hipercard,
    MASTERCARD: Mastercard,
    VISA: Visa,
};

export function CardBrandIcon({ brand }: { brand: CardBrand }) {
    const label = "Bandeira " + brandLabels[brand];
    if (brand === "OTHER")
        return (
            <span aria-label={label} className="credit-card__brand-icon" role="img">
                <CreditCard aria-hidden="true" size={22} />
            </span>
        );
    const Icon = icons[brand];
    return (
        <span aria-label={label} className="credit-card__brand-icon" role="img">
            <Icon aria-hidden="true" height={24} width={38} />
        </span>
    );
}
