import React, { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-yt-dark-secondary rounded-xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-yt-dark-tertiary">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-yt-text-primary">{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-full text-yt-text-secondary hover:bg-yt-dark-tertiary hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-yt-text-secondary">{message}</p>
        </div>
        <div className="flex justify-end gap-3 p-4 bg-yt-dark-tertiary/50 rounded-b-xl">
            <button 
                onClick={onCancel} 
                className="py-2 px-4 bg-yt-dark-tertiary hover:bg-yt-dark-tertiary/80 font-semibold rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm} 
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
                Confirm Delete
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
