// filepath: d:\Simple_CB_LMS\Codebegun\lms-saas\client\src\components\common\Modal.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  maxWidth
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="cb-modal-overlay" onClick={onClose}>
      <div className={`cb-modal cb-modal-${size}`} style={maxWidth ? { maxWidth } : {}} onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">{title}</h2>
          <button className="cb-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cb-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;