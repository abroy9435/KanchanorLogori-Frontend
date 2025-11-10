// src/shared/components/DropDownicon.tsx
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownProps {
  label: ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;

  // style overrides (all optional)
  className?: string;          // root wrapper
  triggerClassName?: string;   // button
  iconClassName?: string;      // chevron wrapper
  contentClassName?: string;   // collapsible grid
  panelClassName?: string;     // inner panel
}

const cx = (...c: Array<string | undefined | null | false>) =>
  c.filter(Boolean).join(" ");

const Dropdown: React.FC<DropdownProps> = ({
  label,
  children,
  defaultOpen = false,
  className,
  triggerClassName,
  iconClassName,
  contentClassName,
  panelClassName,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const toggleDropdown = () => setIsOpen((v) => !v);

  return (
    <div className={cx("w-full max-w-md border-b border-[#564d4e] mx-auto", className)}>
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cx(
          "flex w-full items-center justify-between gap-2 rounded-md bg-[#0D0002] p-3 text-left transition",
          triggerClassName
        )}
      >
        <span className="truncate">{label}</span>
        <span
          className={cx("shrink-0 transition-transform duration-300", isOpen && "rotate-180", iconClassName)}
          aria-hidden
        >
          <ChevronDown size={20} />
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        className={cx(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          contentClassName
        )}
      >
        <div
          className={cx(
            "min-h-0 overflow-hidden px-0 transition-opacity duration-300 transform-gpu",
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          )}
        >
          <div className={cx("mt-2 rounded-md bg-gray-50 p-3 shadow-sm", panelClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dropdown;

// // src/shared/components/DropDownicon.tsx
// import { useId, useState, type ReactNode } from "react";
// import { ChevronDown } from "lucide-react";

// interface DropdownProps {
//   label: ReactNode;
//   children: React.ReactNode;
//   defaultOpen?: boolean;
// }

// const Dropdown: React.FC<DropdownProps> = ({ label, children, defaultOpen = false }) => {
//   const [isOpen, setIsOpen] = useState(defaultOpen);
//   const contentId = useId();

//   const toggleDropdown = () => setIsOpen((v) => !v);

//   return (
//     <div className="w-full max-w-md border-b border-[#564d4e] mx-auto">
//       <button
//         type="button"
//         onClick={toggleDropdown}
//         aria-expanded={isOpen}
//         aria-controls={contentId}
//         className="flex w-full items-center justify-between gap-2 rounded-md"
//       >
//         <span className="truncate">{label}</span>
//         <span
//           className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
//           aria-hidden
//         >
//           <ChevronDown size={20} />
//         </span>
//       </button>

//       {/* Animated container: height auto with grid-rows trick */}
//       <div
//         id={contentId}
//         role="region"
//         className={`grid transition-[grid-template-rows] duration-300 ease-out ${
//           isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
//         }`}
//       >
//         {/* Inner wrapper actually holds the content; we also fade/slide it for niceness */}
//         <div
//           className={`min-h-0 overflow-hidden px-0
//             ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}
//             transition-opacity duration-300 ease-out
//             transform-gpu`}
//         >
//           <div className="mt-2 rounded-md bg-gray-50 p-3 shadow-sm">
//             {children}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dropdown;

