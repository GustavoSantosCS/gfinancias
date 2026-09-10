import { useId, useState } from "react";

import { Button } from "@gfinancias/ui/components/button";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";
import { Textarea } from "@gfinancias/ui/components/textarea";
import { parseCents } from "@/lib/money";
import type {
    Card,
    CardFormError,
    PurchaseDetail,
    PurchaseInput,
    PurchaseUpdateInput,
} from "../types";

import { useFormFeedback } from "../hooks/use-form-feedback";
import { parsePurchaseForm, parsePurchaseUpdateForm } from "../schemas/purchase-form";
import { FormErrors } from "./form-errors";

export function PurchaseFormDialog({
    cards,
    detail,
    errors,
    onClose,
    onSubmit,
    pending,
    focusMonth,
    focusYear,
}: {
    cards: Card[];
    detail?: PurchaseDetail;
    errors?: CardFormError;
    onClose: () => void;
    onSubmit: (input: PurchaseInput | PurchaseUpdateInput) => Promise<void> | void;
    pending: boolean;
    focusMonth: number;
    focusYear: number;
}) {
    const editing = Boolean(detail);
    const feedback = useFormFeedback();
    const today = new Date().toISOString().slice(0, 10);
    const descriptionId = useId();
    const [description, setDescription] = useState(detail?.description ?? "");
    const [amount, setAmount] = useState(detail ? String(detail.amount / 100) : "");
    const [installments, setInstallments] = useState(String(detail?.installments ?? 1));
    const [remainderInstallment, setRemainderInstallment] = useState(
        String(detail?.installments ?? 1),
    );
    const amountInCents = parseCents(amount) ?? 0;
    const installmentCount = Number(installments);
    const needsRemainder =
        amountInCents > 0 && installmentCount > 0 && amountInCents % installmentCount !== 0;
    const first = detail?.schedule.find((entry) => entry.kind === "REGULAR");
    return (
        <Dialog
            className="purchase-form-dialog purchase-create-dialog"
            onClose={onClose}
            title={editing ? "Editar compra" : "Nova compra"}
        >
            <form
                className="form purchase-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    const parsed = detail
                        ? parsePurchaseUpdateForm(
                              data,
                              detail.id,
                              first?.competenceMonth ?? focusMonth,
                              first?.competenceYear ?? focusYear,
                          )
                        : parsePurchaseForm(data, focusMonth, focusYear);
                    if (
                        parsed.success &&
                        detail &&
                        !window.confirm("Alterar estes campos e regenerar as parcelas?")
                    )
                        return;
                    void feedback.submit(parsed, form, onSubmit);
                }}
            >
                <FieldInput
                    autoFocus
                    defaultValue={detail?.title}
                    label="Título"
                    maxLength={60}
                    name="title"
                    {...feedback.field("title")}
                    required
                />
                <div className="form__row">
                    <FieldInput
                        label="Valor"
                        min="0.01"
                        name="amount"
                        {...feedback.field("amount")}
                        onChange={(event) => setAmount(event.target.value)}
                        required
                        step="0.01"
                        type="number"
                        value={amount}
                    />
                    <FieldInput
                        defaultValue={
                            detail
                                ? new Date(detail.purchaseDate).toISOString().slice(0, 10)
                                : today
                        }
                        label="Data da compra"
                        name="purchaseDate"
                        {...feedback.field("purchaseDate")}
                        required
                        type="date"
                    />
                </div>
                <div className="form__row">
                    <Label className="grid gap-1.5">
                        <InputLabel required>Cartão</InputLabel>
                        <Select
                            defaultValue={detail?.card.id ?? cards[0]?.id}
                            name="cardId"
                            {...feedback.field("cardId")}
                        >
                            {cards.map((card) => (
                                <option key={card.id} value={card.id}>
                                    {card.name}
                                </option>
                            ))}
                        </Select>
                    </Label>
                    <Label className="grid gap-1.5">
                        <InputLabel required>Parcelas</InputLabel>
                        <Select
                            defaultValue={String(detail?.installments ?? 1)}
                            name="installments"
                            {...feedback.field("installments")}
                            onChange={(event) => {
                                setInstallments(event.target.value);
                                setRemainderInstallment(event.target.value);
                            }}
                        >
                            {Array.from({ length: 12 }, (_, index) => (
                                <option key={index + 1} value={index + 1}>
                                    {index === 0 ? "À vista" : `${index + 1} parcelas`}
                                </option>
                            ))}
                        </Select>
                    </Label>
                </div>
                {needsRemainder && (
                    <FieldInput
                        value={remainderInstallment}
                        label="Qual parcela vai os centavos"
                        max={installmentCount}
                        min="1"
                        name="remainderInstallment"
                        {...feedback.field("remainderInstallment")}
                        onChange={(event) => setRemainderInstallment(event.target.value)}
                        type="number"
                    />
                )}
                {editing && (
                    <>
                        <input
                            name="focusMonth"
                            type="hidden"
                            value={first?.competenceMonth ?? 1}
                        />
                        <input
                            name="focusYear"
                            type="hidden"
                            value={first?.competenceYear ?? new Date().getFullYear()}
                        />
                    </>
                )}
                <div className="purchase-description-field">
                    <Label htmlFor={descriptionId}>
                        <InputLabel>Descrição</InputLabel>
                    </Label>
                    <Textarea
                        aria-invalid={Boolean(feedback.errors.description)}
                        aria-describedby={[
                            descriptionId + "-count",
                            feedback.errors.description ? "description-error" : null,
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        id={descriptionId}
                        maxLength={500}
                        name="description"
                        onChange={(event) => setDescription(event.target.value)}
                        value={description}
                    />
                    <p className="purchase-description-count" id={`${descriptionId}-count`}>
                        {description.length}/500
                    </p>
                </div>
                <Button
                    className="primary-button form__submit"
                    disabled={pending || feedback.submitting}
                    type="submit"
                    variant="primary"
                >
                    {editing ? "Salvar compra" : "Adicionar compra"}
                </Button>
                <FormErrors errors={{ ...errors, ...feedback.errors }} />
            </form>
        </Dialog>
    );
}
