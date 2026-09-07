import type { Preview } from "@storybook/react";
import "./preview.css";

const preview: Preview = {
    tags: ["autodocs"],
    globalTypes: {
        theme: {
            description: "Tema dos componentes",
            toolbar: {
                title: "Tema",
                icon: "paintbrush",
                items: [
                    { value: "light", title: "Claro" },
                    { value: "dark", title: "Escuro" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: "light" },
    parameters: {
        layout: "fullscreen",
        controls: {
            matchers: { color: /(background|color)$/i, date: /Date$/i },
        },
        a11y: { test: "todo" },
    },
    decorators: [
        (Story, context) => (
            <div className={context.globals.theme === "dark" ? "dark" : ""}>
                <div className="min-h-32 bg-background p-6 text-foreground">
                    <Story />
                </div>
            </div>
        ),
    ],
};

export default preview;
