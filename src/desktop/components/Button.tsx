// import React from "react";

// interface ButtonProps {
//   type: "button" | "submit";
//   text: string;
// }

// const Button: React.FC<ButtonProps> = ({ type, text }) => {
//   return (
//     <button
//       type={type}
//       className="w-full bg-blue-600 text-white py-2 m-auto rounded-md hover:bg-blue-700 transition"
//     >
//       {text}
//     </button>
//   );
// };

// export default Button;
// src/desktop/components/Button.tsx
import React from 'react';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => {
  return (
    <button
      {...rest}
      className={`w-full py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 ${rest.className ?? ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
