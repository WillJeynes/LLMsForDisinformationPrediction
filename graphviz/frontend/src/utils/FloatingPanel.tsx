import { useState, forwardRef, useImperativeHandle } from "react";

export const FloatingPanel = forwardRef(function FloatingPanel(
  { title, children, defaultOpen = true },
  ref
) {
  const [open, setOpen] = useState(defaultOpen);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));

  return (
    <div className="bg-white shadow-lg rounded-2xl w-80 overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 transition"
      >
        <span className="font-semibold">{title}</span>

        <span
          className={`transform transition-transform ${open ? "rotate-180" : ""
            }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`overflow-scroll transition-all duration-300 ${open ? "max-h-[50vh] p-4" : "max-h-0 p-0"
          }`}
      >
        {children}
      </div>
    </div>
  );
});