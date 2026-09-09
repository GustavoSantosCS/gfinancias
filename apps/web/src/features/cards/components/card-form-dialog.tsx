import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@gfinancias/ui/components/button";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { Input } from "@gfinancias/ui/components/input";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";
import type { Card, CardInput, CardUpdateInput, CardFormError } from "../types";
import { cardColors, randomCardColor } from "../utils/card-display";

import { useFormFeedback } from "../hooks/use-form-feedback";
import { parseCardForm, parseCardUpdateForm } from "../schemas/card-form";
import { FormErrors } from "./form-errors";

export function CardFormDialog({
    card,
    errors,
    onArchive,
    onClose,
    onDelete,
    onRestore,
    onSubmit,
    pending,
}: {
    card?: Card;
    errors?: CardFormError;
    onArchive?: () => Promise<void> | void;
    onClose: () => void;
    onDelete?: () => Promise<void> | void;
    onRestore?: () => Promise<void> | void;
    onSubmit: (input: CardInput | CardUpdateInput) => Promise<void> | void;
    pending: boolean;
}) {
    const [color, setColor] = useState(card?.color ?? randomCardColor());
    const editing = Boolean(card);
    const feedback = useFormFeedback();
    return (
        <Dialog onClose={onClose} title={editing ? "Editar cartão" : "Novo cartão"}>
            <form
                className="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const data = new FormData(form);
                    void feedback.submit(
                        card ? parseCardUpdateForm(data, card.id) : parseCardForm(data),
                        form,
                        onSubmit,
                    );
                }}
            >
                <FieldInput
                    {...feedback.field("name")}
                    autoFocus
                    defaultValue={card?.name}
                    label="Nome"
                    maxLength={120}
                    name="name"
                    required
                />
                <fieldset className="color-field">
                    <InputLabel required>Cor visual</InputLabel>
                    <div aria-label="Paleta de cores" className="color-palette">
                        {cardColors.map((option) => (
                            <Button
                                aria-label={`Usar cor ${option}`}
                                aria-pressed={color === option}
                                className="color-swatch"
                                key={option}
                                onClick={() => setColor(option)}
                                size="icon"
                                style={{ backgroundColor: option }}
                                type="button"
                                variant="ghost"
                            >
                                <span className="sr-only">{option}</span>
                            </Button>
                        ))}
                    </div>
                    <div className="color-picker-row">
                        <Input
                            aria-label="Selecionar cor personalizada"
                            name="color"
                            {...feedback.field("color")}
                            onChange={(event) => setColor(event.target.value)}
                            required
                            type="color"
                            value={color}
                        />
                        <Button
                            className="color-random"
                            onClick={() => setColor(randomCardColor())}
                            type="button"
                            variant="outline"
                        >
                            Gerar cor aleatória
                        </Button>
                    </div>
                </fieldset>
                <FieldInput
                    defaultValue={card?.limit ? String(card.limit / 100) : undefined}
                    label="Limite"
                    min="0.01"
                    name="limit"
                    {...feedback.field("limit")}
                    step="0.01"
                    type="number"
                />
                <FieldInput
                    {...feedback.field("closingDay")}
                    defaultValue={card?.closingDay ?? undefined}
                    label="Fechamento"
                    max="31"
                    min="1"
                    name="closingDay"
                    type="number"
                />
                <FieldInput
                    defaultValue={card?.dueDay ?? undefined}
                    label="Vencimento"
                    max="31"
                    min="1"
                    name="dueDay"
                    {...feedback.field("dueDay")}
                    type="number"
                />
                <FieldInput
                    defaultValue={card?.lastDigits ?? undefined}
                    inputMode="numeric"
                    label="Últimos dígitos"
                    maxLength={4}
                    name="lastDigits"
                    {...feedback.field("lastDigits")}
                    pattern="\d{4}"
                />
                <Label className="grid gap-[7px]">
                    <InputLabel>Bandeira</InputLabel>
                    <Select
                        defaultValue={card?.brand ?? ""}
                        name="brand"
                        {...feedback.field("brand")}
                    >
                        <option value="">Não informada</option>
                        <option value="VISA">Visa</option>
                        <option value="MASTERCARD">Mastercard</option>
                        <option value="ELO">Elo</option>
                        <option value="AMERICAN_EXPRESS">American Express</option>
                        <option value="HIPERCARD">Hipercard</option>
                        <option value="OTHER">Outra</option>
                    </Select>
                </Label>
                {(!editing || card?.status === "ACTIVE") && (
                    <Button
                        className="form__submit"
                        disabled={pending || feedback.submitting}
                        type="submit"
                        variant="primary"
                    >
                        {editing ? "Salvar alterações" : "Criar cartão"}
                    </Button>
                )}
                {card && (
                    <div className="card-editor-actions">
                        {card.status === "ACTIVE" ? (
                            <Button
                                disabled={pending || feedback.submitting}
                                onClick={() => void feedback.run(() => onArchive?.())}
                                type="button"
                                variant="warning"
                            >
                                <Archive size={15} /> Arquivar cartão
                            </Button>
                        ) : (
                            <Button
                                disabled={pending || feedback.submitting}
                                onClick={() => void feedback.run(() => onRestore?.())}
                                type="button"
                            >
                                <RotateCcw size={15} /> Restaurar cartão
                            </Button>
                        )}
                        <Button
                            disabled={pending || feedback.submitting}
                            onClick={() => void feedback.run(() => onDelete?.())}
                            type="button"
                            variant="danger"
                        >
                            <Trash2 size={15} /> Remover cartão
                        </Button>
                    </div>
                )}
                <FormErrors errors={{ ...errors, ...feedback.errors }} />
            </form>
        </Dialog>
    );
}
