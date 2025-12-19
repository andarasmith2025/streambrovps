
import React, {useState} from 'react';
import { Stream, StreamStatus } from '../types';
import { Play, StopCircle, Edit, Trash2, Repeat, Clock, Tv2, KeyRound, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface StreamCardProps {
  stream: Stream;
  onEdit: () => void;
  onDelete: () => void;
}

const StreamCard: React.FC<StreamCardProps> = ({ stream, onEdit, onDelete }) => {
  const { updateStream, toggleStreamStatus } = useAppContext();
  const [isLoopLoading, setIsLoopLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);


  const handleToggleLoop = async () => {
    setIsLoopLoading(true);
    try {
        await updateStream({ ...stream, loop: !stream.loop });
    } catch(error) {
        console.error("Failed to toggle loop", error);
    } finally {
        setIsLoopLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsStatusLoading(true);
    try {
        await toggleStreamStatus(stream.id, stream.status);
    } catch(error) {
        console.error("Failed to toggle status", error);
    } finally {
        setIsStatusLoading(false);
    }
  }

  const getStatusIndicator = () => {
    switch (stream.status) {
      case StreamStatus.Running:
        return <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div><span className="text-green-400">Running</span></div>;
      case StreamStatus.Scheduled:
        return <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div><span className="text-yellow-400">Scheduled</span></div>;
      case StreamStatus.Idle:
      default:
        return <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-gray-500 rounded-full"></div><span className="text-yt-text-secondary">Idle</span></div>;
    }
  };
  
  const getScheduleInfo = () => {
    if (stream.scheduleType === 'Recurring' && stream.schedule?.startTime && stream.schedule?.endTime) {
        return `Daily ${stream.schedule.startTime} - ${stream.schedule.endTime}`;
    }
    if (stream.scheduleType === 'Duration' && stream.schedule?.startTime && stream.schedule?.durationHours) {
        return `For ${stream.schedule.durationHours}h from ${stream.schedule.startTime}`;
    }
    return 'Manual Start';
  };

  return (
    <div className="bg-yt-dark-secondary rounded-xl shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:ring-2 hover:ring-yt-red">
      <div className="relative">
        <img src={stream.video?.thumbnailUrl || 'https://placehold.co/400x225/0f0f0f/f1f1f1?text=No+Video'} alt={stream.video?.name || 'Video thumbnail'} className="w-full h-40 object-cover" />
        {stream.video && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {stream.video.duration}
          </div>
        )}
         <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded font-semibold">
           {getStatusIndicator()}
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-yt-text-primary truncate mb-1" title={stream.title}>{stream.title}</h3>
        <p className="text-sm text-yt-text-secondary truncate mb-3" title={stream.video?.name}>{stream.video?.name || 'No video selected'}</p>

        <div className="space-y-2 text-sm text-yt-text-secondary flex-grow">
            <div className="flex items-center gap-2">
                <Tv2 className="w-4 h-4 text-yt-red" />
                <p className="truncate" title={stream.rtmpUrl}>{stream.rtmpUrl}</p>
            </div>
            <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-yt-red" />
                <p className="truncate font-mono" title={stream.streamKey}>••••••••••••••••</p>
            </div>
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yt-red" />
                <p className="truncate">{getScheduleInfo()}</p>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-yt-dark-tertiary flex justify-between items-center">
          <div className="flex gap-2">
             <button onClick={handleToggleStatus} disabled={!stream.video || stream.status === StreamStatus.Scheduled || isStatusLoading} className={`p-2 rounded-full transition-colors ${stream.status === StreamStatus.Running ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white disabled:bg-gray-600 disabled:cursor-not-allowed`}>
              {isStatusLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (stream.status === StreamStatus.Running ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />)}
            </button>
             <button onClick={handleToggleLoop} disabled={isLoopLoading} className={`p-2 rounded-full transition-colors ${stream.loop ? 'bg-blue-600 text-white' : 'bg-yt-dark-tertiary text-yt-text-secondary'} hover:bg-blue-500 disabled:bg-gray-600`}>
                {isLoopLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Repeat className="w-5 h-5"/>}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 rounded-full bg-yt-dark-tertiary text-yt-text-secondary hover:bg-yt-dark-tertiary/80 hover:text-white transition-colors">
                <Edit className="w-5 h-5" />
            </button>
            <button onClick={onDelete} className="p-2 rounded-full bg-yt-dark-tertiary text-yt-text-secondary hover:bg-red-600 hover:text-white transition-colors">
                <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamCard;
