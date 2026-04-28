export function FloatingPanelStack({ children, bot = "sml" }) {
    const botSty = bot == "sml" ? "bottom-4" : "bottom-20"
    return (
        <div className={"fixed right-4 z-50 flex flex-col gap-2 items-end " + botSty}>
            {children}
        </div>
    );
}