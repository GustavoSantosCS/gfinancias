import { Search } from "lucide-react";

import { Input } from "@gfinancias/ui/components/input";
import { InputLabel } from "@gfinancias/ui/components/input-label";
import { Label } from "@gfinancias/ui/components/label";
import { Select } from "@gfinancias/ui/components/select";
import type { PurchaseStatus } from "../types";

export function PurchaseFilters({
    status,
    title,
    onStatusChange,
    onTitleChange,
}: {
    status: PurchaseStatus;
    title: string;
    onStatusChange: (status: PurchaseStatus) => void;
    onTitleChange: (title: string) => void;
}) {
    return (
        <div
            aria-label="Filtros de compras"
            className="panel purchase-filters-card"
            style={{ background: "transparent", border: 0, boxShadow: "none" }}
        >
            <div className="purchase-search">
                <Input
                    aria-label="Pesquisar compras"
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder="Pesquisar..."
                    value={title}
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
                    onChange={(event) => onStatusChange(event.target.value as PurchaseStatus)}
                    value={status}
                >
                    <option value="ALL">Todos</option>
                    <option value="ACTIVE">Ativos</option>
                    <option value="ARCHIVED">Arquivados</option>
                </Select>
            </Label>
        </div>
    );
}
