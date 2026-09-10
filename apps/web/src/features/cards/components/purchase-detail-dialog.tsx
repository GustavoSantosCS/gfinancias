import { useFormFeedback } from "../hooks/use-form-feedback";
import { FormErrors } from "./form-errors";
import { FastForward, Pencil, Trash2 } from "lucide-react";

import { Button } from "@gfinancias/ui/components/button";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { Skeleton } from "@gfinancias/ui/components/skeleton";
import { formatCents } from "@/lib/money";
import { formatDate, formatCompetence } from "@/lib/dates";
import type { PurchaseDetail } from "../types";

export function PurchaseDetailDialog({
    detail,
    error,
    loading,
    onAnticipate,
    onClose,
    onDelete,
    onEdit,
    onRetry,
    pending,
}: {
    detail?: PurchaseDetail;
    error: { message: string } | null;
    loading: boolean;
    onAnticipate: () => void;
    onClose: () => void;
    onDelete: () => Promise<void> | void;
    onEdit: () => void;
    onRetry: () => void;
    pending: boolean;
}) {
    const feedback = useFormFeedback();
    const title = detail ? "Detalhes da compra: " + detail.title : "Detalhes da compra";
    return (
        <Dialog className="purchase-detail-dialog" onClose={onClose} title={title}>
            {loading && (
                <div aria-label="Carregando detalhe da compra" role="status">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="mt-4 h-24 w-full" />
                    <Skeleton className="mt-4 h-40 w-full" />
                </div>
            )}
            {error && !loading && (
                <section role="alert">
                    <p>Não foi possível carregar os detalhes da compra.</p>
                    <Button onClick={onRetry} type="button">
                        Tentar novamente
                    </Button>
                </section>
            )}
            {detail && !loading && !error && (
                <div className="purchase-detail">
                    <dl className="purchase-detail__summary">
                        <div className="purchase-detail__summary-item purchase-detail__summary-item--wide">
                            <div className="purchase-detail__title-row">
                                <div className="purchase-detail__title-content">
                                    <dt>Título</dt>
                                    <dd>{detail.title}</dd>
                                </div>
                                <div className="purchase-detail__title-actions">
                                    <Button
                                        aria-label="Antecipar parcelas"
                                        className="purchase-detail__icon-button cursor-pointer"
                                        disabled={
                                            !detail.schedule.some(
                                                (entry) =>
                                                    entry.kind === "REGULAR" &&
                                                    entry.number >= 2 &&
                                                    detail.card.status === "ACTIVE",
                                            )
                                        }
                                        onClick={onAnticipate}
                                        size="icon"
                                        title="Antecipar parcelas"
                                        type="button"
                                        variant="outline"
                                    >
                                        <FastForward aria-hidden="true" size={15} />
                                    </Button>
                                    <Button
                                        aria-label="Editar compra"
                                        className="purchase-detail__icon-button cursor-pointer"
                                        disabled={
                                            detail.anticipations.length > 0 ||
                                            detail.card.status === "ARCHIVED"
                                        }
                                        onClick={onEdit}
                                        size="icon"
                                        title="Editar compra"
                                        type="button"
                                        variant="outline"
                                    >
                                        <Pencil aria-hidden="true" size={15} />
                                    </Button>
                                    <Button
                                        aria-label="Excluir compra"
                                        className="purchase-detail__icon-button purchase-detail__delete-button"
                                        disabled={
                                            detail.card.status === "ARCHIVED" ||
                                            pending ||
                                            feedback.submitting
                                        }
                                        onClick={() => void feedback.run(onDelete)}
                                        size="icon"
                                        title="Excluir compra"
                                        type="button"
                                        variant="danger"
                                    >
                                        <Trash2 aria-hidden="true" size={15} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="purchase-detail__summary-item">
                            <dt>Valor</dt>
                            <dd>{formatCents(detail.amount)}</dd>
                        </div>
                        <div className="purchase-detail__summary-item">
                            <dt>Data da compra</dt>
                            <dd>{formatDate(detail.purchaseDate)}</dd>
                        </div>
                        <div className="purchase-detail__summary-item">
                            <dt>Parcela ou à vista</dt>
                            <dd>
                                {detail.installments === 1
                                    ? "À vista"
                                    : `${detail.installments} parcelas`}
                            </dd>
                        </div>
                        <div className="purchase-detail__summary-item">
                            <dt>Cartão</dt>
                            <dd>{detail.card.name}</dd>
                        </div>
                        <div className="purchase-detail__summary-item purchase-detail__description">
                            <dt>Descrição</dt>
                            <dd>{detail.description || "Sem descrição"}</dd>
                        </div>
                    </dl>
                    <section
                        aria-labelledby="purchase-schedule-title"
                        className="purchase-detail__schedule"
                    >
                        <h3 id="purchase-schedule-title">Cronograma de parcelas</h3>
                        <div className="purchase-detail__table-wrapper purchase-detail__schedule-scroll">
                            <table aria-label="Cronograma de parcelas">
                                <thead>
                                    <tr>
                                        <th scope="col">Número da parcela</th>
                                        <th scope="col">Mês</th>
                                        <th scope="col">Valor</th>
                                        <th scope="col">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.schedule.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>
                                                {entry.number}/{entry.total}
                                            </td>
                                            <td>
                                                {formatCompetence(
                                                    entry.competenceMonth,
                                                    entry.competenceYear,
                                                )}
                                            </td>
                                            <td>{formatCents(entry.amount)}</td>
                                            <td>
                                                {entry.kind === "ANTICIPATION"
                                                    ? "Antecipada"
                                                    : "Em aberto"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
            <FormErrors errors={feedback.errors} />
        </Dialog>
    );
}
