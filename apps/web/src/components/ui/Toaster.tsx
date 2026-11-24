import { Toaster as SonnerToaster } from "sonner";

/** Root-mounted toast container ensuring single active notification and surviving logout redirects. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      visibleToasts={1}
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "bg-white border border-[#E2E5EC] text-[#111827] shadow-[var(--shadow-md)] rounded-[var(--radius-md)] text-[13px] font-sans",
          description: "text-[#4B5563] text-[12px]",
          closeButton: "bg-white border border-[#E2E5EC] text-[#4B5563] hover:text-[#111827]",
        },
      }}
    />
  );
}
