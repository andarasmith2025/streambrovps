
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import StreamCard from '../components/StreamCard';
import StreamForm from '../components/StreamForm';
import { PlusCircle } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { Stream } from '../types';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const Streams: React.FC = () => {
  const { streams, deleteStream } = useAppContext();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);


  const handleOpenFormModal = (stream?: Stream) => {
    setEditingStream(stream || null);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingStream(null);
  };

  const handleOpenConfirmModal = (stream: Stream) => {
    setStreamToDelete(stream);
    setIsConfirmOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setStreamToDelete(null);
    setIsConfirmOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (streamToDelete) {
        deleteStream(streamToDelete.id);
    }
    handleCloseConfirmModal();
  };
  
  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-yt-text-primary">My Streams</h1>
        <button
          onClick={() => handleOpenFormModal()}
          className="flex items-center gap-2 bg-yt-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Add Stream</span>
        </button>
      </div>

      {streams.length > 0 ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {streams.map(stream => (
            <StreamCard 
              key={stream.id} 
              stream={stream} 
              onEdit={() => handleOpenFormModal(stream)} 
              onDelete={() => handleOpenConfirmModal(stream)}
            />
          ))}
        </div>
      ) : (
         <div className="text-center py-16 px-6 bg-yt-dark-secondary rounded-xl">
          <h2 className="text-xl font-semibold text-yt-text-primary">No Streams Yet</h2>
          <p className="text-yt-text-secondary mt-2">Click "Add Stream" to get started.</p>
        </div>
      )}

      {isFormModalOpen && (
        <Modal title={editingStream ? "Edit Stream" : "Add New Stream"} onClose={handleCloseFormModal}>
            <StreamForm streamToEdit={editingStream} onFinished={handleCloseFormModal} />
        </Modal>
      )}

      {isConfirmOpen && streamToDelete && (
        <ConfirmationModal
            title="Delete Stream"
            message={`Are you sure you want to permanently delete "${streamToDelete.title}"? This action cannot be undone.`}
            onConfirm={handleConfirmDelete}
            onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
};

export default Streams;