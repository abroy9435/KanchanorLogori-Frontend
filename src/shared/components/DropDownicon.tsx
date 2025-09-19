import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DropdownProps {
  label: ReactNode;
  children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={toggleDropdown}
        className="flex justify-between items-center w-full p-3 bg-gray-100 rounded-md hover:bg-gray-200 transition"
      >
        {label}
        <span className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown size={20} />
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-gray-50 border rounded-md shadow-sm">
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
