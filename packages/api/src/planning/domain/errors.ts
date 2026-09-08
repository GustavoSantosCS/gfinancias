export class InvalidPhaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidPhaseError";
    }
}

export class PhaseNotFoundError extends Error {
    constructor() {
        super("Phase was not found");
        this.name = "PhaseNotFoundError";
    }
}

export class IncomeNotFoundError extends Error {
    constructor() {
        super("Income was not found");
        this.name = "IncomeNotFoundError";
    }
}

export class ExpenseNotFoundError extends Error {
    constructor() {
        super("Expense was not found");
        this.name = "ExpenseNotFoundError";
    }
}

export class PhaseContainsRecordsError extends Error {
    constructor() {
        super("A phase with records cannot be deleted");
        this.name = "PhaseContainsRecordsError";
    }
}
