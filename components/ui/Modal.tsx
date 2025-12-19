
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-yt-dark-secondary rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-yt-dark-tertiary">
          <h2 className="text-xl font-bold text-yt-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-yt-text-secondary hover:bg-yt-dark-tertiary hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
