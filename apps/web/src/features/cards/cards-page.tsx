"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@gfinancias/ui/components/button";
import { CreditCard } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@gfinancias/ui/components/empty";
import { currentPeriod } from "@/lib/dates";
import { CardsHeader } from "./components/cards-header";
import { CardFormDialog } from "./components/card-form-dialog";
import { CardGrid } from "./components/card-grid";
import { CardsLoading } from "./components/cards-loading";
import { AnticipationFormDialog } from "./components/anticipation-form-dialog";
import { PurchaseDetailDialog } from "./components/purchase-detail-dialog";
import { PurchaseFormDialog } from "./components/purchase-form-dialog";
import { PurchaseFilters } from "./components/purchase-filters";
import { PurchasesTable } from "./components/purchases-table";
import { useCardMutations } from "./hooks/use-card-mutations";
import { useCardsQueries } from "./hooks/use-cards-queries";
import { usePurchaseMutations } from "./hooks/use-purchase-mutations";
import type { PurchaseStatus } from "./types";

type DialogMode = "detail" | "edit-purchase" | "anticipation" | null;

export function CardsPage({
    embedded = false,
    initialPeriod,
}: {
    embedded?: boolean;
    initialPeriod?: { month: number; year: number };
}) {
    const Container = embedded ? "div" : "main";
    const params = useSearchParams();
    const fallback = useMemo(() => initialPeriod ?? currentPeriod(), [initialPeriod]);
    const month = Number(params.get("month") ?? fallback.month);
    const year = Number(params.get("year") ?? fallback.year);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [filterTitle, setFilterTitle] = useState("");
    const [filterStatus, setFilterStatus] = useState<PurchaseStatus>("ALL");
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const queries = useCardsQueries({
        includeArchived,
        period: { month, year },
        selectedPurchaseId,
        status: filterStatus,
        title: filterTitle,
    });
    const cards = useCardMutations();
    const purchases = usePurchaseMutations();
    const editingCard = queries.cards.find((card) => card.id === editingCardId);
    const visiblePurchases = selectedCardId
        ? queries.purchases.filter((entry) => entry.card.id === selectedCardId)
        : queries.purchases;
    const detail = queries.detailQuery.data;
    const closeDialog = () => {
        setDialogMode(null);
        setSelectedPurchaseId(null);
    };
    const closeDeletedCard = () =>
        flushSync(() => {
            setEditingCardId(null);
            setSelectedCardId(null);
            closeDialog();
        });
    const closeDeletedPurchase = () => flushSync(closeDialog);
    const containerClass = embedded ? undefined : "main";

    if (
        queries.cardsQuery.isLoading ||
        queries.purchasesQuery.isLoading ||
        queries.monthlyPurchasesQuery.isLoading
    )
        return (
            <Container aria-label="Carregando cartões" className={containerClass}>
                <div className={embedded ? undefined : "content"}>
                    <CardsLoading />
                </div>
            </Container>
        );
    if (
        queries.cardsQuery.error ||
        queries.purchasesQuery.error ||
        queries.monthlyPurchasesQuery.error
    )
        return (
            <Container className={containerClass}>
                <div className={embedded ? undefined : "content"}>
                    <section role="alert">
                        <h1>Cartões</h1>
                        <p>Não foi possível carregar os cartões.</p>
                        <Button onClick={() => void queries.retryPage()} type="button">
                            Tentar novamente
                        </Button>
                    </section>
                </div>
            </Container>
        );

    return (
        <Container className={containerClass}>
            <div className={embedded ? undefined : "content"}>
                <CardsHeader
                    canCreatePurchase={queries.activeCards.length > 0}
                    includeArchived={includeArchived}
                    onNewCard={() => setShowCardForm(true)}
                    onNewPurchase={() => setShowPurchaseForm(true)}
                    onToggleArchived={() => setIncludeArchived((value) => !value)}
                />
                {queries.cards.length === 0 ? (
                    <Empty className="panel planning-empty" role="status">
                        <EmptyHeader>
                            <CreditCard size={24} />
                            <EmptyTitle>Nenhum cartão cadastrado</EmptyTitle>
                            <EmptyDescription>
                                Crie um cartão para registrar compras planejadas.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <>
                        <CardGrid
                            cards={queries.cards}
                            month={month}
                            onEdit={(card) => setEditingCardId(card.id)}
                            onSelect={(id) =>
                                setSelectedCardId((current) => (current === id ? null : id))
                            }
                            selectedCardId={selectedCardId}
                            spendingByCard={queries.monthlySpendingByCard}
                        />
                        <PurchaseFilters
                            onStatusChange={setFilterStatus}
                            onTitleChange={setFilterTitle}
                            status={filterStatus}
                            title={filterTitle}
                        />
                        <section className="panel transactions-panel">
                            <div className="panel__header transactions-panel__header">
                                <div className="transactions-panel__heading">
                                    <h2>Detalhamento</h2>
                                </div>
                            </div>
                            <PurchasesTable
                                onOpen={(id) => {
                                    setSelectedPurchaseId(id);
                                    setDialogMode("detail");
                                }}
                                purchases={visiblePurchases}
                            />
                        </section>
                    </>
                )}
                {showCardForm && (
                    <CardFormDialog
                        onClose={() => setShowCardForm(false)}
                        onSubmit={async (input) => {
                            await cards.save(input);
                            setShowCardForm(false);
                        }}
                        pending={cards.pending}
                    />
                )}
                {editingCard && (
                    <CardFormDialog
                        card={editingCard}
                        onArchive={async () => {
                            await cards.archiveCard(editingCard.id);
                            setEditingCardId(null);
                        }}
                        onClose={() => setEditingCardId(null)}
                        onDelete={async () => {
                            if (window.confirm("Excluir este cartão e todo o histórico?"))
                                await cards.removeCard(editingCard.id, closeDeletedCard);
                        }}
                        onRestore={async () => {
                            await cards.restoreCard(editingCard.id);
                            setEditingCardId(null);
                        }}
                        onSubmit={async (input) => {
                            await cards.save(input);
                            setEditingCardId(null);
                        }}
                        pending={cards.pending}
                    />
                )}
                {showPurchaseForm && (
                    <PurchaseFormDialog
                        cards={queries.activeCards}
                        focusMonth={month}
                        focusYear={year}
                        onClose={() => setShowPurchaseForm(false)}
                        onSubmit={async (input) => {
                            await purchases.save(input);
                            setShowPurchaseForm(false);
                        }}
                        pending={purchases.pending}
                    />
                )}
                {selectedPurchaseId && dialogMode === "detail" && (
                    <PurchaseDetailDialog
                        detail={detail}
                        error={queries.detailQuery.error}
                        loading={queries.detailQuery.isLoading}
                        onAnticipate={() => setDialogMode("anticipation")}
                        onClose={closeDialog}
                        onDelete={async () => {
                            if (
                                detail &&
                                window.confirm("Excluir esta compra e todas as parcelas?")
                            )
                                await purchases.removePurchase(detail.id, closeDeletedPurchase);
                        }}
                        onEdit={() => setDialogMode("edit-purchase")}
                        onRetry={() => void queries.retryDetail()}
                        pending={purchases.pending}
                    />
                )}
                {selectedPurchaseId && dialogMode === "edit-purchase" && detail && (
                    <PurchaseFormDialog
                        cards={queries.activeCards}
                        detail={detail}
                        focusMonth={month}
                        focusYear={year}
                        onClose={closeDialog}
                        onSubmit={async (input) => {
                            await purchases.save(input);
                            closeDialog();
                        }}
                        pending={purchases.pending}
                    />
                )}
                {selectedPurchaseId && dialogMode === "anticipation" && detail && (
                    <AnticipationFormDialog
                        detail={detail}
                        focusMonth={month}
                        focusYear={year}
                        onClose={closeDialog}
                        onSubmit={async (input) => {
                            await purchases.anticipatePurchase(input);
                            closeDialog();
                        }}
                        pending={purchases.pending}
                    />
                )}
            </div>
        </Container>
    );
}
