export class CardNotFoundError extends Error {
    constructor() {
        super("Cartão não encontrado.");
        this.name = "CardNotFoundError";
    }
}

export class PurchaseNotFoundError extends Error {
    constructor() {
        super("Compra não encontrada.");
        this.name = "PurchaseNotFoundError";
    }
}

export class DuplicateCardNameError extends Error {
    constructor() {
        super("Nome já em uso!");
        this.name = "DuplicateCardNameError";
    }
}

export class ArchivedCardError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ArchivedCardError";
    }
}

export class InvalidCivilDateError extends Error {
    constructor() {
        super("Data civil inválida.");
        this.name = "InvalidCivilDateError";
    }
}

export class InvalidRemainderInstallmentError extends Error {
    constructor() {
        super("Parcela de centavos inválida.");
        this.name = "InvalidRemainderInstallmentError";
    }
}

export class PurchaseHasAnticipationsError extends Error {
    constructor() {
        super("Compras com antecipação não podem ser editadas.");
        this.name = "PurchaseHasAnticipationsError";
    }
}

export class FirstInstallmentAnticipationError extends Error {
    constructor() {
        super("A primeira parcela não pode ser antecipada.");
        this.name = "FirstInstallmentAnticipationError";
    }
}

export class NonConsecutiveInstallmentsError extends Error {
    constructor() {
        super("As parcelas devem ser consecutivas.");
        this.name = "NonConsecutiveInstallmentsError";
    }
}

export class UnavailableInstallmentError extends Error {
    constructor() {
        super("Uma ou mais parcelas não estão disponíveis.");
        this.name = "UnavailableInstallmentError";
    }
}
