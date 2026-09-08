"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, CreditCard, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@gfinancias/ui/components/button";
import { Dialog } from "@gfinancias/ui/components/dialog";
import { FieldInput } from "@gfinancias/ui/components/field-input";
import { Input } from "@gfinancias/ui/components/input";
import { Skeleton } from "@gfinancias/ui/components/skeleton";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";

import { trpc } from "@/utils/trpc";

const money = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

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

function CardsLoading({ month, year }: { month: number; year: number }) {
    return (
        <>
            <section className="page-heading compact">
                <div>
                    <span className="eyebrow">Compras planejadas</span>
                    <h1>Cartões</h1>
                    <p>
                        Competência: {String(month).padStart(2, "0")}/{year}
                    </p>
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
            <section className="panel transactions-panel">
                <div className="panel__header">
                    <div>
                        <span className="eyebrow">Detalhamento</span>
                        <h2>Compras da competência</h2>
                    </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="mt-2 h-12 w-full" />
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
    const [purchaseDescription, setPurchaseDescription] = useState("");
    const [purchaseStatus, setPurchaseStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");

    const cardsQuery = useQuery(trpc.cards.list.queryOptions({ includeArchived }));
    const purchasesQuery = useQuery(
        trpc.cards.listPurchases.queryOptions({
            ...(purchaseDescription ? { description: purchaseDescription } : {}),
            month,
            status: purchaseStatus,
            year,
        }),
    );
    const createCard = useMutation(trpc.cards.create.mutationOptions());
    const createPurchase = useMutation(trpc.cards.createPurchase.mutationOptions());
    const updateCard = useMutation(trpc.cards.update.mutationOptions());
    const archive = useMutation(trpc.cards.archive.mutationOptions());
    const restore = useMutation(trpc.cards.restore.mutationOptions());
    const remove = useMutation(trpc.cards.delete.mutationOptions());

    const refresh = async () => {
        await Promise.all([cardsQuery.refetch(), purchasesQuery.refetch()]);
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
                focusMonth: month,
                focusYear: year,
                installments,
                purchaseDate: formValue(data, "purchaseDate"),
                remainderInstallment: Number(
                    formValue(data, "remainderInstallment") || installments,
                ),
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

    if (cardsQuery.isLoading || purchasesQuery.isLoading) {
        return (
            <Container aria-label="Carregando cartões" className={embedded ? undefined : "main"}>
                <div className={embedded ? undefined : "content"}>
                    <CardsLoading month={month} year={year} />
                </div>
            </Container>
        );
    }
    if (cardsQuery.error || purchasesQuery.error) {
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
                        <p>
                            Competência: {String(month).padStart(2, "0")}/{year}
                        </p>
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
                                        <CreditCard size={22} />
                                    </div>
                                    <strong>{card.name}</strong>
                                    {card.lastDigits && <small>{"•••• " + card.lastDigits}</small>}
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
                    <section aria-label="Filtros de compras" className="panel transactions-filters">
                        <div className="transactions-filters__search">
                            <Input
                                aria-label="Filtrar por descrição"
                                onChange={(event) => setPurchaseDescription(event.target.value)}
                                placeholder="Pesquisar..."
                                value={purchaseDescription}
                            />
                            <span aria-hidden="true" className="transactions-filters__search-icon">
                                <Search size={15} />
                            </span>
                        </div>
                        <Select
                            aria-label="Estado"
                            className="transactions-filters__state"
                            onChange={(event) =>
                                setPurchaseStatus(
                                    event.target.value as "ALL" | "ACTIVE" | "ARCHIVED",
                                )
                            }
                            value={purchaseStatus}
                        >
                            <option value="ALL">Todos os estados</option>
                            <option value="ACTIVE">Ativos</option>
                            <option value="ARCHIVED">Arquivados</option>
                        </Select>
                    </section>
                )}

                {cards.length > 0 && (
                    <section className="panel transactions-panel">
                        <div className="panel__header">
                            <div className="transactions-panel__heading">
                                <h2>Detalhamento</h2>
                            </div>
                        </div>
                        {purchases.length ? (
                            <div className="transactions-table">
                                <div className="transactions-table__head">
                                    <span>Descrição</span>
                                    <span>Valor</span>
                                    <span>Parcela</span>
                                    <span>Competência</span>
                                    <span>Cartão</span>
                                </div>
                                {purchases.map((entry) => (
                                    <div className="transactions-table__row" key={entry.id}>
                                        <span>{entry.description}</span>
                                        <strong>{money.format(entry.amount / 100)}</strong>
                                        <span>
                                            {entry.kind === "ANTICIPATION"
                                                ? "Antecipação"
                                                : entry.total === 1
                                                  ? "À vista"
                                                  : entry.number + "/" + entry.total}
                                        </span>
                                        <span>
                                            {String(entry.competenceMonth).padStart(2, "0")}/
                                            {entry.competenceYear}
                                        </span>
                                        <span>
                                            {entry.card.name}
                                            {entry.card.status === "ARCHIVED" ? " (arquivado)" : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Nenhuma compra nesta competência.</p>
                        )}
                    </section>
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
    return (
        <Dialog onClose={onClose} title="Nova compra">
            <form className="form" onSubmit={onSubmit}>
                <FieldInput
                    autoFocus
                    label="Descrição"
                    maxLength={255}
                    name="description"
                    required
                />
                <FieldInput
                    label="Valor"
                    min="0.01"
                    name="amount"
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
                    <Select defaultValue="1" name="installments">
                        <option value="1">À vista</option>
                        {Array.from({ length: 11 }, (_, index) => (
                            <option key={index + 2} value={index + 2}>
                                {index + 2} parcelas
                            </option>
                        ))}
                    </Select>
                </Label>
                <FieldInput
                    defaultValue="1"
                    label="Parcela com centavos restantes"
                    min="1"
                    name="remainderInstallment"
                    type="number"
                />
                <Button className="primary-button form__submit" disabled={pending} type="submit">
                    Adicionar compra
                </Button>
                {error && <p role="alert">{error}</p>}
            </form>
        </Dialog>
    );
}
