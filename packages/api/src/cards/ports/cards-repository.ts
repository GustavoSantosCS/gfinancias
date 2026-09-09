export type CardStatus = "ACTIVE" | "ARCHIVED";
export type CardBrand = "VISA" | "MASTERCARD" | "ELO" | "AMERICAN_EXPRESS" | "HIPERCARD" | "OTHER";
export type InstallmentKind = "REGULAR" | "ANTICIPATION";

export type Card = {
    brand: CardBrand | null;
    closingDay: number | null;
    color: string;
    createdAt: Date;
    dueDay: number | null;
    id: string;
    lastDigits: string | null;
    limit: number | null;
    name: string;
    normalizedName: string;
    status: CardStatus;
    updatedAt: Date;
};

export type CardInstallment = {
    amount: number;
    anticipationId: string | null;
    competenceMonth: number;
    competenceYear: number;
    createdAt: Date;
    id: string;
    kind: InstallmentKind;
    number: number;
    purchaseId: string;
    total: number;
};

export type CardAnticipation = {
    createdAt: Date;
    date: Date;
    description: string;
    id: string;
    mode: string;
    purchaseId: string;
    snapshot: string;
};

export type CardPurchase = {
    amount: number;
    cardId: string;
    createdAt: Date;
    description: string | null;
    id: string;
    installments: number;
    purchaseDate: Date;
    title: string;
    updatedAt: Date;
};

export type CardPurchaseDetails = CardPurchase & {
    anticipations: Array<CardAnticipation & { entries: CardInstallment[] }>;
    card: Card;
    entries: CardInstallment[];
};

export type NewInstallment = Omit<
    CardInstallment,
    "anticipationId" | "createdAt" | "id" | "kind" | "purchaseId"
> & {
    anticipationId?: string;
    kind?: InstallmentKind;
    purchaseId?: string;
};

export type MonthlyPurchase = CardInstallment & {
    card: Card;
    description: string | null;
    purchaseAmount: number;
    purchaseDate: Date;
    title: string;
};

export type CreateCardData = {
    brand?: CardBrand;
    closingDay?: number;
    color: string;
    dueDay?: number;
    lastDigits?: string;
    limit?: number;
    name: string;
    normalizedName: string;
};

export type UpdateCardData = Partial<Omit<CreateCardData, "normalizedName">> & {
    normalizedName?: string;
    status?: CardStatus;
};

export type CreatePurchaseData = {
    amount: number;
    cardId: string;
    description: string | null;
    installments: number;
    purchaseDate: Date;
    title: string;
};

export type UpdatePurchaseData = Partial<CreatePurchaseData>;

export type CreateAnticipationData = {
    date: Date;
    description: string;
    mode: string;
    purchaseId: string;
    snapshot: string;
};

export interface CardsRepository {
    createAnticipation(input: CreateAnticipationData): Promise<CardAnticipation>;
    createCard(input: CreateCardData): Promise<Card>;
    createInstallments(input: Array<NewInstallment & { purchaseId: string }>): Promise<void>;
    createPurchase(input: {
        data: CreatePurchaseData;
        entries: NewInstallment[];
    }): Promise<CardPurchase & { entries: CardInstallment[] }>;
    deleteCard(id: string): Promise<Card>;
    deletePurchase(id: string): Promise<CardPurchase>;
    deleteInstallments(ids: string[]): Promise<void>;
    findCard(id: string): Promise<Card | null>;
    findCardByNormalizedName(normalizedName: string): Promise<Card | null>;
    findPurchase(id: string): Promise<CardPurchaseDetails | null>;
    listCards(includeArchived: boolean): Promise<Card[]>;
    listPurchases(input: {
        cardId?: string;
        month: number;
        status: "ALL" | CardStatus;
        title?: string;
        year: number;
    }): Promise<MonthlyPurchase[]>;
    updateCard(id: string, data: UpdateCardData): Promise<Card>;
    updatePurchase(input: {
        data: UpdatePurchaseData;
        entries?: NewInstallment[];
        id: string;
    }): Promise<CardPurchase & { entries: CardInstallment[] }>;
}

export interface CardsUnitOfWork {
    run<T>(operation: (repository: CardsRepository) => Promise<T>): Promise<T>;
}
