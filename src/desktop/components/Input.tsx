// import React from "react";

// interface InputProps {
//   type: string;
//   placeholder: string;
//   value: string;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
// }

// const Input: React.FC<InputProps> = ({ type, placeholder, value, onChange }) => {
//   return (
//     <input
//       type={type}
//       placeholder={placeholder}
//       value={value}
//       onChange={onChange}
//       className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//     />
//   );
// };

// export default Input;
// src/desktop/components/Input.tsx
import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<Props> = (props) => {
  return <input className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />;
};

export default Input;
