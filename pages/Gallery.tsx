
import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UploadCloud } from 'lucide-react';
import { Video } from '../types';
import VideoItem from '../components/VideoItem';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const Gallery: React.FC = () => {
  const { videos, addVideo, deleteVideo } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  const handleUploadClick = () => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  };
  
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(file);

    videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        
        videoElement.currentTime = 1; // Seek to 1s to get a good frame
        videoElement.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

                const newVideo: Omit<Video, 'id'> = {
                    name: file.name,
                    duration: formatDuration(duration),
                    thumbnailUrl,
                    url: videoElement.src,
                };
                addVideo(newVideo);
            }
            setIsProcessing(false);
            URL.revokeObjectURL(videoElement.src);
        };
    };
    videoElement.onerror = () => {
        console.error("Error loading video file.");
        alert("Could not process the selected video file.");
        setIsProcessing(false);
    }

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleOpenConfirmModal = (video: Video) => {
    setVideoToDelete(video);
    setIsConfirmOpen(true);
  };
  
  const handleCloseConfirmModal = () => {
    setVideoToDelete(null);
    setIsConfirmOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (videoToDelete) {
        deleteVideo(videoToDelete.id);
    }
    handleCloseConfirmModal();
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-yt-text-primary">Video Gallery</h1>
         <button
          onClick={handleUploadClick}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:bg-blue-800 disabled:cursor-wait"
        >
          <UploadCloud className="h-5 w-5" />
          <span>{isProcessing ? 'Processing...' : 'Upload Video'}</span>
        </button>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/mp4,video/x-m4v,video/*"
        />
      </div>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {videos.map(video => (
              <VideoItem key={video.id} video={video} onDelete={() => handleOpenConfirmModal(video)} />
            ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 bg-yt-dark-secondary rounded-xl border-2 border-dashed border-yt-dark-tertiary">
            <h2 className="text-xl font-semibold text-yt-text-primary">Your Gallery is Empty</h2>
            <p className="text-yt-text-secondary mt-2">Click "Upload Video" to add your first video file.</p>
        </div>
      )}

      {isConfirmOpen && videoToDelete && (
        <ConfirmationModal
            title="Delete Video"
            message={`Are you sure you want to delete "${videoToDelete.name}"? This will remove the video from the gallery and unset it from any streams using it.`}
            onConfirm={handleConfirmDelete}
            onCancel={handleCloseConfirmModal}
        />
      )}
    </div>
  );
};

export default Gallery;