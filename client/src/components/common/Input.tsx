import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  name,
  label,
  error,
  className,
  ...rest
}) => {
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {rest.required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        className={`input ${error ? 'input-error' : ''} ${className || ''}`}
        {...rest}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default Input;