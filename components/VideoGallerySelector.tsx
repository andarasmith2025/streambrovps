
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Video } from '../types';

interface VideoGallerySelectorProps {
  onSelectVideo: (video: Video) => void;
}

export const VideoGallerySelector: React.FC<VideoGallerySelectorProps> = ({ onSelectVideo }) => {
  const { videos } = useAppContext();

  return (
    <div>
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto pr-2">
          {videos.map(video => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className="bg-yt-dark-tertiary rounded-lg overflow-hidden group relative cursor-pointer border-2 border-transparent hover:border-yt-red transition-all"
            >
              <img src={video.thumbnailUrl} alt={video.name} className="w-full h-24 object-cover" />
              <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                {video.duration}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-yt-text-primary truncate" title={video.name}>{video.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 bg-yt-dark-tertiary rounded-lg">
          <h3 className="text-lg font-semibold text-yt-text-primary">No Videos in Gallery</h3>
          <p className="text-yt-text-secondary mt-1 text-sm">Please upload videos in the 'Gallery' tab first.</p>
        </div>
      )}
    </div>
  );
};
