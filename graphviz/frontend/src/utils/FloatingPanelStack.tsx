export function FloatingPanelStack({ children }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {children}
    </div>
  );
}