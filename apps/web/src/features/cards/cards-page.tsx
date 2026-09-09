"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
    Archive,
    CreditCard,
    FastForward,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ComponentType, type FormEvent, type SVGProps, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@gfinancias/ui/components/button";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { Input } from "@gfinancias/ui/components/input";
import { Skeleton } from "@gfinancias/ui/components/skeleton";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";
import { Textarea } from "@gfinancias/ui/components/textarea";
import {
    AmericanExpress,
    Elo,
    Hipercard,
    Mastercard,
    Visa,
} from "react-svg-credit-card-payment-icons/icons/logo";

import { trpc } from "@/utils/trpc";

const money = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const brandLabels = {
    AMERICAN_EXPRESS: "American Express",
    ELO: "Elo",
    HIPERCARD: "Hipercard",
    MASTERCARD: "Mastercard",
    OTHER: "Outra",
    VISA: "Visa",
} as const;
type CardBrand = keyof typeof brandLabels;
const brandIcons: Record<Exclude<CardBrand, "OTHER">, ComponentType<SVGProps<SVGSVGElement>>> = {
    AMERICAN_EXPRESS: AmericanExpress,
    ELO: Elo,
    HIPERCARD: Hipercard,
    MASTERCARD: Mastercard,
    VISA: Visa,
};

function CardBrandIcon({ brand }: { brand: CardBrand }) {
    const label = "Bandeira " + brandLabels[brand];
    if (brand === "OTHER") {
        return (
            <span aria-label={label} className="credit-card__brand-icon" role="img">
                <CreditCard aria-hidden="true" size={22} />
            </span>
        );
    }
    const Icon = brandIcons[brand];
    return (
        <span aria-label={label} className="credit-card__brand-icon" role="img">
            <Icon aria-hidden="true" height={24} width={38} />
        </span>
    );
}

function formatDayAndMonth(day: number, month: number) {
    return String(day).padStart(2, "0") + "/" + String(month).padStart(2, "0");
}

function formValue(data: FormData, key: string) {
    const value = data.get(key);
    return typeof value === "string" ? value : "";
}

function toCents(value: string) {
    const normalized = value.trim().replace(",", ".");
    return Math.round(Number(normalized) * 100);
}

function currentPeriod() {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function CardsLoading() {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Compras planejadas</span>
                    <h1>Cartões</h1>
                </div>
                <div className="heading-actions">
                    <Button variant="default" disabled type="button">
                        Mostrar arquivados
                    </Button>
                    <Button variant="default" disabled type="button">
                        <Plus size={16} /> Novo cartão
                    </Button>
                    <Button variant="primary" disabled type="button">
                        <Plus size={16} /> Nova compra
                    </Button>
                </div>
            </section>
            <section
                aria-label="Carregando cartões cadastrados"
                className="cards-grid"
                role="status"
            >
                {Array.from({ length: 3 }, (_, index) => (
                    <article className="credit-card" key={index}>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </article>
                ))}
            </section>
        </>
    );
}

export function CardsPage({ embedded = false }: { embedded?: boolean }) {
    const Container = embedded ? "div" : "main";
    const params = useSearchParams();
    const fallback = useMemo(currentPeriod, []);
    const month = Number(params.get("month") ?? fallback.month);
    const year = Number(params.get("year") ?? fallback.year);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [editingCard, setEditingCard] = useState<EditableCard | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [filterTitle, setFilterTitle] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
    const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
    const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<any>(null);
    const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
    const [anticipatingPurchaseId, setAnticipatingPurchaseId] = useState<string | null>(null);

    const cardsQuery = useQuery(trpc.cards.list.queryOptions({ includeArchived }));
    const purchasesQuery = useQuery(
        trpc.cards.listPurchases.queryOptions({
            title: filterTitle || undefined,
            month,
            status: filterStatus,
            year,
        }),
    );
    const monthlyPurchasesQuery = useQuery(
        trpc.cards.listPurchases.queryOptions({ month, status: "ALL", year }),
    );
    const createCard = useMutation(trpc.cards.create.mutationOptions());
    const createPurchase = useMutation(trpc.cards.createPurchase.mutationOptions());
    const updateCard = useMutation(trpc.cards.update.mutationOptions());
    const archive = useMutation(trpc.cards.archive.mutationOptions());
    const restore = useMutation(trpc.cards.restore.mutationOptions());
    const remove = useMutation(trpc.cards.delete.mutationOptions());
    const updatePurchase = useMutation(trpc.cards.updatePurchase.mutationOptions());
    const deletePurchase = useMutation(trpc.cards.deletePurchase.mutationOptions());
    const anticipate = useMutation(trpc.cards.anticipate.mutationOptions());
    const detailOptions: any = expandedPurchaseId
        ? trpc.cards.getPurchase.queryOptions({ id: expandedPurchaseId })
        : { queryKey: ["cards", "purchase-detail"], queryFn: async () => null, enabled: false };
    const purchaseDetailQuery = useQuery(detailOptions);

    const refresh = async () => {
        await Promise.all([
            cardsQuery.refetch(),
            purchasesQuery.refetch(),
            monthlyPurchasesQuery.refetch(),
        ]);
    };

    const submitCard = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const limit = formValue(data, "limit");
        const closingDay = formValue(data, "closingDay");
        const dueDay = formValue(data, "dueDay");
        const lastDigits = formValue(data, "lastDigits");
        const brand = formValue(data, "brand");

        createCard.mutate(
            {
                color: formValue(data, "color"),
                ...(limit ? { limit: toCents(limit) } : {}),
                ...(closingDay && dueDay
                    ? { closingDay: Number(closingDay), dueDay: Number(dueDay) }
                    : {}),
                ...(lastDigits ? { lastDigits } : {}),
                ...(brand
                    ? {
                          brand: brand as
                              | "VISA"
                              | "MASTERCARD"
                              | "ELO"
                              | "AMERICAN_EXPRESS"
                              | "HIPERCARD"
                              | "OTHER",
                      }
                    : {}),
                name: formValue(data, "name"),
            },
            {
                onError: (error) => toast.error(error.message),
                onSuccess: async () => {
                    await refresh();
                    setShowCardForm(false);
                    toast.success("Cartão criado.");
                },
            },
        );
    };

    const submitUpdateCard = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingCard) return;
        const data = new FormData(event.currentTarget);
        const limit = formValue(data, "limit");
        const closingDay = formValue(data, "closingDay");
        const dueDay = formValue(data, "dueDay");
        const lastDigits = formValue(data, "lastDigits");
        const brand = formValue(data, "brand");
        updateCard.mutate(
            {
                id: editingCard.id,
                color: formValue(data, "color"),
                ...(limit ? { limit: toCents(limit) } : {}),
                ...(closingDay && dueDay
                    ? { closingDay: Number(closingDay), dueDay: Number(dueDay) }
                    : {}),
                ...(lastDigits ? { lastDigits } : {}),
                ...(brand
                    ? {
                          brand: brand as
                              | "VISA"
                              | "MASTERCARD"
                              | "ELO"
                              | "AMERICAN_EXPRESS"
                              | "HIPERCARD"
                              | "OTHER",
                      }
                    : {}),
                name: formValue(data, "name"),
            },
            {
                onError: (error) => toast.error(error.message),
                onSuccess: async () => {
                    await refresh();
                    setEditingCard(null);
                    toast.success("Cartão atualizado.");
                },
            },
        );
    };

    const submitPurchase = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const installments = Number(formValue(data, "installments"));
        createPurchase.mutate(
            {
                amount: toCents(formValue(data, "amount")),
                cardId: formValue(data, "cardId"),
                description: formValue(data, "description"),
                title: formValue(data, "title"),
                focusMonth: month,
                focusYear: year,
                installments,
                purchaseDate: formValue(data, "purchaseDate"),
                ...(Number(formValue(data, "remainderInstallment"))
                    ? { remainderInstallment: Number(formValue(data, "remainderInstallment")) }
                    : {}),
            },
            {
                onError: (error) => toast.error(error.message),
                onSuccess: async () => {
                    await refresh();
                    setShowPurchaseForm(false);
                    toast.success("Compra criada.");
                },
            },
        );
    };

    const detail: any = purchaseDetailQuery.data;
    const actionDetail = selectedPurchaseDetail ?? detail;

    if (cardsQuery.isLoading || purchasesQuery.isLoading || monthlyPurchasesQuery.isLoading) {
        return (
            <Container aria-label="Carregando cartões" className={embedded ? undefined : "main"}>
                <div className={embedded ? undefined : "content"}>
                    <CardsLoading />
                </div>
            </Container>
        );
    }
    if (cardsQuery.error || purchasesQuery.error || monthlyPurchasesQuery.error) {
        return (
            <Container className={embedded ? undefined : "main"}>
                <div className={embedded ? undefined : "content"}>
                    <section role="alert">
                        <h1>Cartões</h1>
                        <p>Não foi possível carregar os cartões.</p>
                        <Button variant="default" onClick={() => void refresh()} type="button">
                            Tentar novamente
                        </Button>
                    </section>
                </div>
            </Container>
        );
    }

    const cards = cardsQuery.data ?? [];
    const activeCards = cards.filter((card) => card.status === "ACTIVE");
    const monthlySpendingByCard = new Map<string, number>();
    for (const entry of monthlyPurchasesQuery.data ?? []) {
        monthlySpendingByCard.set(
            entry.card.id,
            (monthlySpendingByCard.get(entry.card.id) ?? 0) + entry.amount,
        );
    }
    const purchases = selectedCardId
        ? (purchasesQuery.data ?? []).filter((entry) => entry.card.id === selectedCardId)
        : (purchasesQuery.data ?? []);

    return (
        <Container className={embedded ? undefined : "main"}>
            <div className={embedded ? undefined : "content"}>
                <section className="page-heading compact">
                    <div>
                        <span className="eyebrow">Compras planejadas</span>
                        <h1>Cartões</h1>
                    </div>
                    <div className="heading-actions">
                        <Button
                            variant="default"
                            onClick={() => setIncludeArchived((value) => !value)}
                            type="button"
                        >
                            {includeArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => setShowCardForm(true)}
                            type="button"
                        >
                            <Plus size={16} /> Novo cartão
                        </Button>
                        <Button
                            variant="primary"
                            disabled={activeCards.length === 0}
                            onClick={() => setShowPurchaseForm(true)}
                            type="button"
                        >
                            <Plus size={16} /> Nova compra
                        </Button>
                    </div>
                </section>

                {cards.length === 0 ? (
                    <section className="panel planning-empty" role="status">
                        <CreditCard size={24} />
                        <div>
                            <h2>Nenhum cartão cadastrado</h2>
                            <p>Crie um cartão para registrar compras planejadas.</p>
                        </div>
                    </section>
                ) : (
                    <section aria-label="Cartões cadastrados" className="cards-grid">
                        {cards.map((card) => {
                            const selected = selectedCardId === card.id;
                            const spending = monthlySpendingByCard.get(card.id);
                            const billingDates =
                                card.closingDay && card.dueDay
                                    ? {
                                          closing: formatDayAndMonth(card.closingDay, month),
                                          due: formatDayAndMonth(
                                              card.dueDay,
                                              card.dueDay < card.closingDay
                                                  ? month === 12
                                                      ? 1
                                                      : month + 1
                                                  : month,
                                          ),
                                      }
                                    : null;
                            return (
                                <article
                                    aria-label={"Filtrar por " + card.name}
                                    aria-pressed={selected}
                                    className={
                                        "credit-card" + (selected ? " credit-card--selected" : "")
                                    }
                                    key={card.id}
                                    onClick={() =>
                                        setSelectedCardId((current) =>
                                            current === card.id ? null : card.id,
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setSelectedCardId((current) =>
                                                current === card.id ? null : card.id,
                                            );
                                        }
                                    }}
                                    role="button"
                                    style={{ backgroundColor: card.color, color: "#fff" }}
                                    tabIndex={0}
                                >
                                    <div>
                                        {card.status === "ARCHIVED" && <span>ARQUIVADO</span>}
                                        {card.brand ? (
                                            <CardBrandIcon brand={card.brand} />
                                        ) : (
                                            <CreditCard size={22} />
                                        )}
                                    </div>
                                    <strong>{card.name}</strong>
                                    <div className="credit-card__metadata">
                                        <small>
                                            {card.limit ? money.format(card.limit / 100) : "\u00a0"}
                                        </small>
                                        <small>
                                            {card.lastDigits ? "•••• " + card.lastDigits : "\u00a0"}
                                        </small>
                                        <small>
                                            {billingDates
                                                ? "Fechamento: " +
                                                  billingDates.closing +
                                                  " - Vencimento: " +
                                                  billingDates.due
                                                : "\u00a0"}
                                        </small>
                                        <small>
                                            {spending
                                                ? "Gasto do mês: " + money.format(spending / 100)
                                                : "\u00a0"}
                                        </small>
                                    </div>
                                    <Button
                                        aria-label={"Editar " + card.name}
                                        className="credit-card__edit"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setEditingCard(card);
                                        }}
                                        size="icon"
                                        type="button"
                                        variant="ghost"
                                    >
                                        <Pencil size={15} />
                                    </Button>
                                </article>
                            );
                        })}
                    </section>
                )}

                {cards.length > 0 && (
                    <>
                        <div
                            aria-label="Filtros de compras"
                            className="panel purchase-filters-card"
                            style={{ background: "transparent", border: 0, boxShadow: "none" }}
                        >
                            <div className="purchase-search">
                                <Input
                                    aria-label="Pesquisar compras"
                                    onChange={(event) => setFilterTitle(event.target.value)}
                                    placeholder="Pesquisar..."
                                    value={filterTitle}
                                />
                                <button
                                    aria-label="Pesquisar compras"
                                    className="purchase-search__button"
                                    type="button"
                                >
                                    <Search aria-hidden="true" size={16} />
                                </button>
                            </div>
                            <Label className="purchase-status-filter">
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    onChange={(event) =>
                                        setFilterStatus(
                                            event.target.value as "ALL" | "ACTIVE" | "ARCHIVED",
                                        )
                                    }
                                    value={filterStatus}
                                >
                                    <option value="ALL">Todos</option>
                                    <option value="ACTIVE">Ativos</option>
                                    <option value="ARCHIVED">Arquivados</option>
                                </Select>
                            </Label>
                        </div>
                        <section className="panel transactions-panel">
                            <div className="panel__header transactions-panel__header">
                                <div className="transactions-panel__heading">
                                    <h2>Detalhamento</h2>
                                </div>
                            </div>
                            {purchases.length ? (
                                <div className="transactions-table">
                                    <div className="transactions-table__head">
                                        <span>Título</span>
                                        <span>Valor</span>
                                        <span>Parcela</span>
                                        <span>Data</span>
                                        <span>Cartão</span>
                                    </div>
                                    {purchases.map((entry) => (
                                        <div
                                            aria-expanded={expandedPurchaseId === entry.purchaseId}
                                            aria-label={"Abrir detalhes de " + entry.title}
                                            className="transactions-table__row transactions-table__row--interactive"
                                            key={entry.id}
                                            onClick={() => setExpandedPurchaseId(entry.purchaseId)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    setExpandedPurchaseId(entry.purchaseId);
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <span>{entry.title}</span>
                                            <strong>{money.format(entry.amount / 100)}</strong>
                                            <span>
                                                {entry.kind === "ANTICIPATION"
                                                    ? "Antecipação"
                                                    : entry.total === 1
                                                      ? "À vista"
                                                      : entry.number + "/" + entry.total}
                                            </span>
                                            <span>
                                                {entry.purchaseDate
                                                    ? new Date(
                                                          entry.purchaseDate,
                                                      ).toLocaleDateString("pt-BR")
                                                    : String(entry.competenceMonth).padStart(
                                                          2,
                                                          "0",
                                                      ) +
                                                      "/" +
                                                      entry.competenceYear}
                                            </span>
                                            <span>
                                                {entry.card.name}
                                                {entry.card.status === "ARCHIVED"
                                                    ? " (arquivado)"
                                                    : ""}
                                            </span>
                                        </div>
                                    ))}
                                    {detail && expandedPurchaseId === detail.id && (
                                        <PurchaseDetail
                                            detail={detail}
                                            onAnticipate={() => {
                                                setAnticipatingPurchaseId(detail.id);
                                                setSelectedPurchaseDetail(detail);
                                                setExpandedPurchaseId(null);
                                            }}
                                            onClose={() => {
                                                setExpandedPurchaseId(null);
                                                setSelectedPurchaseDetail(null);
                                            }}
                                            onDelete={() => {
                                                if (
                                                    detail.card.status === "ACTIVE" &&
                                                    window.confirm(
                                                        "Excluir esta compra e todas as parcelas?",
                                                    )
                                                ) {
                                                    deletePurchase.mutate(
                                                        { id: detail.id },
                                                        {
                                                            onSuccess: async () => {
                                                                await refresh();
                                                                setExpandedPurchaseId(null);
                                                                setSelectedPurchaseDetail(null);
                                                                toast.success("Compra excluída.");
                                                            },
                                                            onError: (error) =>
                                                                toast.error(error.message),
                                                        },
                                                    );
                                                }
                                            }}
                                            onEdit={() => {
                                                setEditingPurchaseId(detail.id);
                                                setSelectedPurchaseDetail(detail);
                                                setExpandedPurchaseId(null);
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <p className="transactions-empty">
                                    Nenhuma compra nesta competência.
                                </p>
                            )}
                        </section>
                    </>
                )}

                {showCardForm && (
                    <CardForm
                        error={createCard.error?.message}
                        pending={createCard.isPending}
                        onClose={() => setShowCardForm(false)}
                        onSubmit={submitCard}
                    />
                )}
                {editingCard && (
                    <CardForm
                        card={editingCard}
                        error={updateCard.error?.message}
                        pending={updateCard.isPending}
                        onArchive={() =>
                            archive.mutate(
                                { id: editingCard.id },
                                {
                                    onSuccess: async () => {
                                        await refresh();
                                        setEditingCard(null);
                                    },
                                },
                            )
                        }
                        onClose={() => setEditingCard(null)}
                        onDelete={() => {
                            if (window.confirm("Excluir este cartão e todo o histórico?"))
                                remove.mutate(
                                    { id: editingCard.id },
                                    {
                                        onSuccess: async () => {
                                            await refresh();
                                            setEditingCard(null);
                                        },
                                    },
                                );
                        }}
                        onRestore={() =>
                            restore.mutate(
                                { id: editingCard.id },
                                {
                                    onSuccess: async () => {
                                        await refresh();
                                        setEditingCard(null);
                                    },
                                },
                            )
                        }
                        onSubmit={submitUpdateCard}
                    />
                )}
                {editingPurchaseId && actionDetail && (
                    <PurchaseEditor
                        cards={activeCards}
                        detail={actionDetail}
                        error={updatePurchase.error?.message}
                        onClose={() => {
                            setEditingPurchaseId(null);
                            setSelectedPurchaseDetail(null);
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                            const data = new FormData(event.currentTarget);
                            const installments = Number(formValue(data, "installments"));
                            const changingSchedule = Boolean(
                                formValue(data, "amount") ||
                                installments !== actionDetail.installments ||
                                formValue(data, "focusMonth"),
                            );
                            if (
                                changingSchedule &&
                                !window.confirm("Alterar estes campos e regenerar as parcelas?")
                            )
                                return;
                            updatePurchase.mutate(
                                {
                                    cardId: formValue(data, "cardId"),
                                    id: actionDetail.id,
                                    description: formValue(data, "description"),
                                    title: formValue(data, "title"),
                                    purchaseDate: formValue(data, "purchaseDate"),
                                    ...(formValue(data, "amount")
                                        ? { amount: toCents(formValue(data, "amount")) }
                                        : {}),
                                    ...(installments !== actionDetail.installments
                                        ? { installments }
                                        : {}),
                                    ...(formValue(data, "remainderInstallment")
                                        ? {
                                              remainderInstallment: Number(
                                                  formValue(data, "remainderInstallment"),
                                              ),
                                          }
                                        : {}),
                                },
                                {
                                    onSuccess: async () => {
                                        await refresh();
                                        setEditingPurchaseId(null);
                                        setExpandedPurchaseId(null);
                                        toast.success("Compra atualizada.");
                                    },
                                    onError: (error) => toast.error(error.message),
                                },
                            );
                        }}
                        pending={updatePurchase.isPending}
                    />
                )}
                {anticipatingPurchaseId && actionDetail && (
                    <AnticipationForm
                        detail={actionDetail}
                        error={anticipate.error?.message}
                        focusMonth={month}
                        focusYear={year}
                        onClose={() => {
                            setAnticipatingPurchaseId(null);
                            setSelectedPurchaseDetail(null);
                        }}
                        onSubmit={(input) =>
                            anticipate.mutate(input, {
                                onSuccess: async () => {
                                    await refresh();
                                    setAnticipatingPurchaseId(null);
                                    setSelectedPurchaseDetail(null);
                                    toast.success("Antecipação registrada.");
                                },
                                onError: (error) => toast.error(error.message),
                            })
                        }
                        pending={anticipate.isPending}
                    />
                )}
                {showPurchaseForm && (
                    <PurchaseForm
                        cards={activeCards}
                        error={createPurchase.error?.message}
                        pending={createPurchase.isPending}
                        onClose={() => setShowPurchaseForm(false)}
                        onSubmit={submitPurchase}
                    />
                )}
            </div>
        </Container>
    );
}

const cardColors = [
    "#0f766e",
    "#2563eb",
    "#7c3aed",
    "#be123c",
    "#c2410c",
    "#a16207",
    "#15803d",
    "#334155",
] as const;

function randomCardColor() {
    return (
        "#" +
        Math.floor(Math.random() * 0x1000000)
            .toString(16)
            .padStart(6, "0")
    );
}

type EditableCard = {
    brand?: "VISA" | "MASTERCARD" | "ELO" | "AMERICAN_EXPRESS" | "HIPERCARD" | "OTHER" | null;
    closingDay?: number | null;
    color: string;
    dueDay?: number | null;
    id: string;
    lastDigits?: string | null;
    limit?: number | null;
    name: string;
    status: "ACTIVE" | "ARCHIVED";
};

function CardForm({
    card,
    error,
    onArchive,
    onClose,
    onDelete,
    onRestore,
    onSubmit,
    pending,
}: {
    card?: EditableCard;
    error?: string;
    onArchive?: () => void;
    onClose: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pending: boolean;
}) {
    const [color, setColor] = useState(card?.color ?? randomCardColor());
    const editing = Boolean(card);

    return (
        <Dialog onClose={onClose} title={editing ? "Editar cartão" : "Novo cartão"}>
            <form className="form" onSubmit={onSubmit}>
                <FieldInput
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
                                aria-label={"Usar cor " + option}
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
                    step="0.01"
                    type="number"
                />
                <FieldInput
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
                    type="number"
                />
                <FieldInput
                    defaultValue={card?.lastDigits ?? undefined}
                    inputMode="numeric"
                    label="Últimos dígitos"
                    maxLength={4}
                    name="lastDigits"
                    pattern="\d{4}"
                />
                <Label className="grid gap-[7px]">
                    <InputLabel>Bandeira</InputLabel>
                    <Select defaultValue={card?.brand ?? ""} name="brand">
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
                        variant="primary"
                        disabled={pending}
                        type="submit"
                    >
                        {editing ? "Salvar alterações" : "Criar cartão"}
                    </Button>
                )}
                {card && (
                    <div className="card-editor-actions">
                        {card.status === "ACTIVE" ? (
                            <Button onClick={onArchive} type="button" variant="warning">
                                <Archive size={15} /> Arquivar cartão
                            </Button>
                        ) : (
                            <Button onClick={onRestore} type="button" variant="default">
                                <RotateCcw size={15} /> Restaurar cartão
                            </Button>
                        )}
                        <Button onClick={onDelete} type="button" variant="danger">
                            <Trash2 size={15} /> Remover cartão
                        </Button>
                    </div>
                )}
                {error && <p role="alert">{error}</p>}
            </form>
        </Dialog>
    );
}

function PurchaseForm({
    cards,
    error,
    onClose,
    onSubmit,
    pending,
}: {
    cards: Array<{ id: string; name: string }>;
    error?: string;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pending: boolean;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const descriptionId = useId();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [installments, setInstallments] = useState("1");
    const amountInCents = toCents(amount);
    const installmentCount = Number(installments);
    const needsRemainder =
        Number.isFinite(amountInCents) &&
        amountInCents > 0 &&
        installmentCount > 0 &&
        amountInCents % installmentCount !== 0;

    return (
        <Dialog
            className="purchase-form-dialog purchase-create-dialog"
            onClose={onClose}
            title="Nova compra"
        >
            <form className="form purchase-form purchase-create-form" onSubmit={onSubmit}>
                <FieldInput autoFocus label="Título" maxLength={60} name="title" required />
                <div className="form__row">
                    <FieldInput
                        label="Valor"
                        min="0.01"
                        name="amount"
                        onChange={(event) => setAmount(event.target.value)}
                        required
                        step="0.01"
                        type="number"
                    />
                    <FieldInput
                        defaultValue={today}
                        label="Data da compra"
                        name="purchaseDate"
                        required
                        type="date"
                    />
                </div>
                <div className="form__row">
                    <Label className="grid gap-1.5">
                        <InputLabel required>Cartão</InputLabel>
                        <Select defaultValue={cards[0]?.id} name="cardId">
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
                            defaultValue="1"
                            name="installments"
                            onChange={(event) => setInstallments(event.target.value)}
                        >
                            <option value="1">À vista</option>
                            {Array.from({ length: 11 }, (_, index) => (
                                <option key={index + 2} value={index + 2}>
                                    {index + 2} parcelas
                                </option>
                            ))}
                        </Select>
                    </Label>
                </div>
                {needsRemainder && (
                    <FieldInput
                        defaultValue={installments}
                        label="Qual parcela vai os centavos"
                        min="1"
                        max={installmentCount}
                        name="remainderInstallment"
                        type="number"
                    />
                )}
                <div className="purchase-description-field">
                    <Label htmlFor={descriptionId}>
                        <InputLabel>Descrição</InputLabel>
                    </Label>
                    <Textarea
                        aria-describedby={descriptionId + "-count"}
                        id={descriptionId}
                        maxLength={500}
                        name="description"
                        onChange={(event) => setDescription(event.target.value)}
                        value={description}
                    />
                    <p id={descriptionId + "-count"} className="purchase-description-count">
                        {description.length}/500
                    </p>
                </div>
                <Button className="primary-button form__submit" disabled={pending} type="submit">
                    Adicionar compra
                </Button>
                {error && <p role="alert">{error}</p>}
            </form>
        </Dialog>
    );
}
function PurchaseDetail({
    detail,
    onAnticipate,
    onClose,
    onDelete,
    onEdit,
}: {
    detail: any;
    onAnticipate: () => void;
    onClose: () => void;
    onDelete: () => void;
    onEdit: () => void;
}) {
    const eligible = (entry: any) =>
        entry.kind === "REGULAR" && entry.number >= 2 && detail.card.status === "ACTIVE";
    const canAnticipate = detail.schedule.some(eligible);
    const installmentLabel =
        detail.installments === 1 ? "À vista" : `${detail.installments} parcelas`;

    return (
        <Dialog
            className="purchase-detail-dialog"
            onClose={onClose}
            title={"Detalhes da compra: " + detail.title}
        >
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
                                    className="purchase-detail__icon-button"
                                    disabled={!canAnticipate}
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
                                    className="purchase-detail__icon-button"
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
                                    disabled={detail.card.status === "ARCHIVED"}
                                    onClick={onDelete}
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
                        <dd>{money.format(detail.amount / 100)}</dd>
                    </div>
                    <div className="purchase-detail__summary-item">
                        <dt>Data da compra</dt>
                        <dd>{new Date(detail.purchaseDate).toLocaleDateString("pt-BR")}</dd>
                    </div>
                    <div className="purchase-detail__summary-item">
                        <dt>Parcela ou à vista</dt>
                        <dd>{installmentLabel}</dd>
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
                                {detail.schedule.map((entry: any) => (
                                    <tr key={entry.id}>
                                        <td>
                                            {entry.number}/{entry.total}
                                        </td>
                                        <td>
                                            {String(entry.competenceMonth).padStart(2, "0")}/
                                            {entry.competenceYear}
                                        </td>
                                        <td>{money.format(entry.amount / 100)}</td>
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
        </Dialog>
    );
}

function PurchaseEditor({
    cards,
    detail,
    error,
    onClose,
    onSubmit,
    pending,
}: {
    cards: Array<{ id: string; name: string }>;
    detail: any;
    error?: string;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pending: boolean;
}) {
    const first = detail.schedule.find((entry: any) => entry.kind === "REGULAR");
    const descriptionId = useId();
    const [description, setDescription] = useState(detail.description ?? "");
    const [amount, setAmount] = useState(String(detail.amount / 100));
    const [installments, setInstallments] = useState(String(detail.installments));
    const [remainderInstallment, setRemainderInstallment] = useState(String(detail.installments));
    const amountInCents = toCents(amount);
    const installmentCount = Number(installments);
    const needsRemainder =
        Number.isFinite(amountInCents) &&
        amountInCents > 0 &&
        installmentCount > 0 &&
        amountInCents % installmentCount !== 0;

    return (
        <Dialog
            className="purchase-form-dialog purchase-create-dialog"
            onClose={onClose}
            title="Editar compra"
        >
            <form className="form purchase-form" onSubmit={onSubmit}>
                <FieldInput
                    autoFocus
                    defaultValue={detail.title}
                    label="Título"
                    maxLength={60}
                    name="title"
                    required
                />
                <div className="form__row">
                    <FieldInput
                        defaultValue={String(detail.amount / 100)}
                        label="Valor"
                        min="0.01"
                        name="amount"
                        onChange={(event) => setAmount(event.target.value)}
                        required
                        step="0.01"
                        type="number"
                    />
                    <FieldInput
                        defaultValue={new Date(detail.purchaseDate).toISOString().slice(0, 10)}
                        label="Data da compra"
                        name="purchaseDate"
                        required
                        type="date"
                    />
                </div>
                <div className="form__row">
                    <Label className="grid gap-1.5">
                        <InputLabel required>Cartão</InputLabel>
                        <Select defaultValue={detail.card.id} name="cardId">
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
                            defaultValue={String(detail.installments)}
                            name="installments"
                            onChange={(event) => {
                                setInstallments(event.target.value);
                                setRemainderInstallment(event.target.value);
                            }}
                        >
                            <option value="1">À vista</option>
                            {Array.from({ length: 11 }, (_, index) => (
                                <option key={index + 2} value={index + 2}>
                                    {index + 2} parcelas
                                </option>
                            ))}
                        </Select>
                    </Label>
                </div>
                {needsRemainder && (
                    <FieldInput
                        label="Qual parcela vai os centavos"
                        max={installmentCount}
                        min="1"
                        name="remainderInstallment"
                        onChange={(event) => setRemainderInstallment(event.target.value)}
                        type="number"
                        value={remainderInstallment}
                    />
                )}
                <div className="purchase-description-field">
                    <Label htmlFor={descriptionId}>
                        <InputLabel>Descrição</InputLabel>
                    </Label>
                    <Textarea
                        aria-describedby={descriptionId + "-count"}
                        id={descriptionId}
                        maxLength={500}
                        name="description"
                        onChange={(event) => setDescription(event.target.value)}
                        value={description}
                    />
                    <p id={descriptionId + "-count"} className="purchase-description-count">
                        {description.length}/500
                    </p>
                </div>
                <input name="focusMonth" type="hidden" value={first?.competenceMonth ?? 1} />
                <input
                    name="focusYear"
                    type="hidden"
                    value={first?.competenceYear ?? new Date().getFullYear()}
                />
                <Button disabled={pending} type="submit" variant="primary">
                    Salvar compra
                </Button>
                {error && <p role="alert">{error}</p>}
            </form>
        </Dialog>
    );
}

function AnticipationForm({
    detail,
    error,
    focusMonth,
    focusYear,
    onClose,
    onSubmit,
    pending,
}: {
    detail: any;
    error?: string;
    focusMonth: number;
    focusYear: number;
    onClose: () => void;
    onSubmit: (input: any) => void;
    pending: boolean;
}) {
    const available = detail.schedule.filter(
        (entry: any) => entry.kind === "REGULAR" && entry.number >= 2,
    );
    const [selected, setSelected] = useState<number[]>(available.map((entry: any) => entry.number));
    const [mode, setMode] = useState<"SEPARATE" | "GROUPED">("GROUPED");
    const [values, setValues] = useState<string[]>([]);
    const today = new Date().toISOString().slice(0, 10);
    const selectedEntries = available.filter((entry: any) => selected.includes(entry.number));
    const originalTotal = selectedEntries.reduce(
        (sum: number, entry: any) => sum + entry.amount,
        0,
    );
    const anticipatedValues =
        mode === "GROUPED"
            ? [toCents(values[0] ?? String(originalTotal / 100))]
            : selectedEntries.map((entry: any, index: number) =>
                  toCents(values[index] ?? String(entry.amount / 100)),
              );
    const anticipatedTotal = anticipatedValues.reduce(
        (sum: number, value: number) => sum + value,
        0,
    );
    const newTotal = detail.amount - originalTotal + anticipatedTotal;
    const discount = originalTotal - anticipatedTotal;
    const generatedDescription =
        detail.title +
        " - parcelas " +
        selected.join(", ") +
        ", valor original " +
        originalTotal +
        ", valor antecipado " +
        anticipatedTotal +
        ", competências " +
        selectedEntries
            .map((entry: any) => entry.competenceMonth + "/" + entry.competenceYear)
            .join(", ");
    const toggle = (number: number) => {
        if (selected.includes(number)) setSelected(selected.filter((item) => item !== number));
        else {
            const next = [...selected, number].sort((a, b) => a - b);
            if (next.every((item, index) => index === 0 || item === next[index - 1] + 1))
                setSelected(next);
        }
    };
    return (
        <Dialog className="anticipation-dialog" onClose={onClose} title="Antecipar parcelas">
            <form
                className="form anticipation-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit({
                        date: formValue(new FormData(event.currentTarget), "date"),
                        focusMonth,
                        focusYear,
                        mode,
                        purchaseId: detail.id,
                        selectedNumbers: selected,
                        values: anticipatedValues,
                    });
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
                    required
                    type="date"
                />
                <fieldset className="anticipation-parcels-fieldset">
                    <legend>
                        <InputLabel required>Parcelas</InputLabel>
                    </legend>
                    <div className="anticipation-parcels-list anticipation-parcels-grid">
                        {available.map((entry: any) => (
                            <label className="anticipation-parcel-option" key={entry.number}>
                                <input
                                    aria-label={`Parcela ${entry.number} de ${entry.total}`}
                                    checked={selected.includes(entry.number)}
                                    onChange={() => toggle(entry.number)}
                                    type="checkbox"
                                />
                                <span>
                                    Parcela {entry.number}/{entry.total}
                                </span>
                                <strong>{money.format(entry.amount / 100)}</strong>
                            </label>
                        ))}
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
                        defaultValue={String(originalTotal / 100)}
                        label="Valor da parcela de agrupamento"
                        min="0.01"
                        name="value"
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
                                {selectedEntries.map((entry: any, index: number) => (
                                    <tr key={entry.number}>
                                        <td>
                                            {entry.number}/{entry.total}
                                        </td>
                                        <td>
                                            <Input
                                                aria-label={`Valor parcela ${entry.number}`}
                                                min="0.01"
                                                name={`value-${entry.number}`}
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
                        <dd>{money.format(detail.amount / 100)}</dd>
                    </div>
                    <div className="anticipation-summary-item">
                        <dt>Novo valor total</dt>
                        <dd>{money.format(newTotal / 100)}</dd>
                    </div>
                    <div className="anticipation-summary-item">
                        <dt>Desconto da antecipação</dt>
                        <dd>{money.format(discount / 100)}</dd>
                    </div>
                </dl>
                <div className="anticipation-description">
                    <InputLabel>Descrição que será criada pelo sistema</InputLabel>
                    <p>{generatedDescription}</p>
                </div>
                <div className="anticipation-actions">
                    <Button onClick={onClose} type="button" variant="default">
                        Cancelar
                    </Button>
                    <Button
                        disabled={pending || selected.length === 0}
                        type="submit"
                        variant="primary"
                    >
                        Salvar
                    </Button>
                </div>
                {error && <p role="alert">{error}</p>}
            </form>
        </Dialog>
    );
}
