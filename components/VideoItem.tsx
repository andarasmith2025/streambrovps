
import React from 'react';
import { Video } from '../types';
import { Trash2 } from 'lucide-react';

interface VideoItemProps {
    video: Video;
    onDelete: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ video, onDelete }) => {
    return (
        <div className="bg-yt-dark-secondary rounded-lg overflow-hidden group relative">
            <img src={video.thumbnailUrl} alt={video.name} className="w-full h-32 object-cover"/>
            <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                {video.duration}
            </div>
            <div className="p-3">
                <p className="text-sm font-medium text-yt-text-primary truncate" title={video.name}>{video.name}</p>
            </div>
            <button 
                onClick={onDelete}
                className="absolute top-1 left-1 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete video"
            >
                <Trash2 className="w-4 h-4"/>
            </button>
        </div>
    );
};

export default VideoItem;