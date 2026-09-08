const planningErrorTranslations: Record<string, string> = {
    "A phase with records cannot be deleted":
        "Uma fase com entradas ou saídas não pode ser excluída.",
    "Invalid phase": "A fase informada é inválida.",
    "Monthly plan was not found": "O planejamento mensal não foi encontrado.",
    "Phase dates cannot overlap": "As datas da fase não podem se sobrepor a outra fase.",
    "Phase dates must be within the selected month":
        "As datas da fase devem estar dentro do mês selecionado.",
    "Phase was not found": "A fase não foi encontrada.",
};

export function translatePlanningError(message: string) {
    return planningErrorTranslations[message] ?? "Não foi possível concluir a operação.";
}
