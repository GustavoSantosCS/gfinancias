export function normalizeCardName(name: string) {
    const displayName = name.trim().replace(/\s+/g, " ");
    return {
        displayName,
        normalizedName: displayName.toLocaleLowerCase("pt-BR"),
    };
}
