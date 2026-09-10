import { useState } from "react";

import { Button } from "@gfinancias/ui/components/button";
import { Checkbox } from "@gfinancias/ui/components/checkbox";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { Input } from "@gfinancias/ui/components/input";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";
import { formatCents } from "@/lib/money";
import type { AnticipationInput, CardFormError, PurchaseDetail } from "../types";
import {
    availableAnticipationEntries,
    anticipationPreview,
    toggleConsecutiveSelection,
} from "../utils/anticipation";

import { useFormFeedback } from "../hooks/use-form-feedback";
import { parseAnticipationInput } from "../schemas/anticipation-form";
import { FormErrors } from "./form-errors";

export function AnticipationFormDialog({
    detail,
    errors,
    focusMonth,
    focusYear,
    onClose,
    onSubmit,
    pending,
}: {
    detail: PurchaseDetail;
    errors?: CardFormError;
    focusMonth: number;
    focusYear: number;
    onClose: () => void;
    onSubmit: (input: AnticipationInput) => Promise<void> | void;
    pending: boolean;
}) {
    const available = availableAnticipationEntries(detail);
    const feedback = useFormFeedback();
    const [selected, setSelected] = useState(available.map((entry) => entry.number));
    const [mode, setMode] = useState<"SEPARATE" | "GROUPED">("GROUPED");
    const [values, setValues] = useState<string[]>([]);
    const today = new Date().toISOString().slice(0, 10);
    const selectedEntries = available.filter((entry) => selected.includes(entry.number));
    const preview = anticipationPreview(detail, selected, mode, values);
    return (
        <Dialog className="anticipation-dialog" onClose={onClose} title="Antecipar parcelas">
            <form
                className="form anticipation-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    const date = new FormData(event.currentTarget).get("date");
                    void feedback.submit(
                        parseAnticipationInput({
                            date: typeof date === "string" ? date : today,
                            focusMonth,
                            focusYear,
                            mode,
                            purchaseId: detail.id,
                            selectedNumbers: selected,
                            values: preview.anticipatedValues,
                        }),
                        event.currentTarget,
                        onSubmit,
                    );
                }}
            >
                <div className="anticipation-purchase-title">
                    <InputLabel>Título da compra</InputLabel>
                    <strong>{detail.title}</strong>
                </div>
                <FieldInput
                    autoFocus
                    defaultValue={today}
                    label="Data de antecipação"
                    name="date"
                    {...feedback.field("date")}
                    required
                    type="date"
                />
                <fieldset
                    className="anticipation-parcels-fieldset"
                    aria-describedby={
                        feedback.errors.selectedNumbers ? "selectedNumbers-error" : undefined
                    }
                >
                    <legend>
                        <InputLabel required>Parcelas</InputLabel>
                    </legend>
                    <div
                        aria-label="Parcelas disponíveis"
                        className="anticipation-parcels-list anticipation-parcels-grid"
                    >
                        {available.map((entry) => {
                            const id = `anticipation-${entry.number}`;
                            return (
                                <label
                                    className="anticipation-parcel-option"
                                    key={entry.number}
                                    htmlFor={id}
                                >
                                    <Checkbox
                                        aria-label={`Parcela ${entry.number} de ${entry.total}`}
                                        className="anticipation-parcel-checkbox"
                                        id={id}
                                        checked={selected.includes(entry.number)}
                                        onCheckedChange={() =>
                                            setSelected((current) =>
                                                toggleConsecutiveSelection(current, entry.number),
                                            )
                                        }
                                    />
                                    <span aria-hidden="true">
                                        Parcela {entry.number}/{entry.total}
                                    </span>
                                    <strong aria-hidden="true">{formatCents(entry.amount)}</strong>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
                <Label className="grid gap-1.5">
                    <InputLabel required>Modo</InputLabel>
                    <Select
                        onChange={(event) => setMode(event.target.value as "SEPARATE" | "GROUPED")}
                        value={mode}
                    >
                        <option value="GROUPED">Agrupado</option>
                        <option value="SEPARATE">Separado</option>
                    </Select>
                </Label>
                {mode === "GROUPED" ? (
                    <FieldInput
                        value={values[0] ?? String(preview.originalTotal / 100)}
                        label="Valor da parcela de agrupamento"
                        min="0.01"
                        name="values"
                        {...feedback.field("values")}
                        onChange={(event) => setValues([event.target.value])}
                        required
                        step="0.01"
                        type="number"
                    />
                ) : (
                    <div className="anticipation-separate-table anticipation-values-scroll">
                        <table aria-label="Parcelas antecipadas">
                            <thead>
                                <tr>
                                    <th scope="col">Número da parcela</th>
                                    <th scope="col">Valor da parcela</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedEntries.map((entry, index) => (
                                    <tr key={entry.number}>
                                        <td>
                                            {entry.number}/{entry.total}
                                        </td>
                                        <td>
                                            <Input
                                                aria-label={`Valor parcela ${entry.number}`}
                                                min="0.01"
                                                name="values"
                                                {...feedback.field("values")}
                                                onChange={(event) =>
                                                    setValues((current) => {
                                                        const next = [...current];
                                                        next[index] = event.target.value;
                                                        return next;
                                                    })
                                                }
                                                required
                                                step="0.01"
                                                type="number"
                                                value={values[index] ?? String(entry.amount / 100)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <dl className="anticipation-summary">
                    <div className="anticipation-summary-item">
                        <dt>Valor original da compra</dt>
                        <dd>{formatCents(detail.amount)}</dd>
                    </div>
                    <div className="anticipation-summary-item">
                        <dt>Novo valor total</dt>
                        <dd>{formatCents(preview.newTotal)}</dd>
                    </div>
                    <div className="anticipation-summary-item">
                        <dt>Desconto da antecipação</dt>
                        <dd>{formatCents(preview.discount)}</dd>
                    </div>
                </dl>
                <div className="anticipation-description">
                    <InputLabel>Descrição que será criada pelo sistema</InputLabel>
                    <p>{preview.description}</p>
                </div>
                <div className="anticipation-actions">
                    <Button onClick={onClose} type="button" variant="default">
                        Cancelar
                    </Button>
                    <Button
                        disabled={pending || feedback.submitting || selected.length === 0}
                        type="submit"
                        variant="primary"
                    >
                        Salvar
                    </Button>
                </div>
                <FormErrors errors={{ ...errors, ...feedback.errors }} />
            </form>
        </Dialog>
    );
}
