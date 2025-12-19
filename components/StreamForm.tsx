
import React, { useState, useEffect } from 'react';
import { Stream, Video, ScheduleType } from '../types';
import { useAppContext } from '../context/AppContext';
import { ChevronDown, Film, Info, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';
import { VideoGallerySelector } from './VideoGallerySelector';

interface StreamFormProps {
  streamToEdit?: Stream | null;
  onFinished: () => void;
}

const StreamForm: React.FC<StreamFormProps> = ({ streamToEdit, onFinished }) => {
  const { addStream, updateStream } = useAppContext();
  
  const [title, setTitle] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loop, setLoop] = useState(true);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(ScheduleType.Manual);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [durationHours, setDurationHours] = useState(4);
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isFormValid = title && streamKey && selectedVideo && !isSaving;

  useEffect(() => {
    if (streamToEdit) {
      setTitle(streamToEdit.title);
      setRtmpUrl(streamToEdit.rtmpUrl);
      setStreamKey(streamToEdit.streamKey);
      setSelectedVideo(streamToEdit.video);
      setLoop(streamToEdit.loop);
      setScheduleType(streamToEdit.scheduleType);
      if (streamToEdit.schedule) {
        setStartTime(streamToEdit.schedule.startTime || '08:00');
        setEndTime(streamToEdit.schedule.endTime || '12:00');
        setDurationHours(streamToEdit.schedule.durationHours || 4);
      }
      setIsAdvancedOpen(streamToEdit.scheduleType !== ScheduleType.Manual);
    }
  }, [streamToEdit]);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setIsGalleryOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert('Please fill in Title, Stream Key, and select a video.');
      return;
    }
    
    setIsSaving(true);

    const streamData = {
      title,
      rtmpUrl,
      streamKey,
      video: selectedVideo,
      loop,
      scheduleType,
      schedule: scheduleType !== ScheduleType.Manual ? {
        startTime: scheduleType === ScheduleType.Recurring || scheduleType === ScheduleType.Duration ? startTime : undefined,
        endTime: scheduleType === ScheduleType.Recurring ? endTime : undefined,
        durationHours: scheduleType === ScheduleType.Duration ? durationHours : undefined,
      } : undefined,
    };

    try {
        if (streamToEdit) {
            await updateStream({ ...streamToEdit, ...streamData });
        } else {
            await addStream(streamData as Omit<Stream, 'id'|'userId'|'status'>);
        }
        onFinished();
    } catch(error) {
        console.error("Failed to save stream:", error);
        alert("An error occurred while saving the stream. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-yt-text-primary">
      <div>
        <label className="block text-sm font-medium text-yt-text-secondary mb-1">Stream Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-yt-text-secondary mb-1">YouTube RTMP URL</label>
        <input type="text" value={rtmpUrl} onChange={e => setRtmpUrl(e.target.value)} className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-yt-text-secondary mb-1">Stream Key</label>
        <input type="password" value={streamKey} onChange={e => setStreamKey(e.target.value)} className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-yt-text-secondary mb-1">Video Source</label>
        <div className="mt-1 flex items-center gap-3">
          <div className="flex-grow p-3 bg-yt-dark-tertiary rounded-lg text-sm flex items-center gap-3">
            <Film className={`w-5 h-5 ${selectedVideo ? 'text-yt-red' : 'text-yt-text-secondary'}`} />
            <span className="truncate">{selectedVideo?.name || 'No video selected'}</span>
          </div>
          <button type="button" onClick={() => setIsGalleryOpen(true)} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            Select
          </button>
        </div>
         <div className="p-2 mt-2 bg-blue-900/30 text-blue-300 text-xs rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>You can upload new videos in the 'Gallery' tab.</span>
          </div>
      </div>

      <div className="bg-yt-dark-tertiary/50 rounded-lg">
        <button type="button" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full flex justify-between items-center p-3 font-semibold">
          Advanced Options
          <ChevronDown className={`w-5 h-5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
        </button>
        {isAdvancedOpen && (
          <div className="p-4 border-t border-yt-dark-tertiary space-y-4">
            <div>
              <label className="block text-sm font-medium text-yt-text-secondary mb-2">Loop Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="loop" checked={loop} onChange={() => setLoop(true)} className="form-radio bg-yt-dark-tertiary text-yt-red" /> Loop Video</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="loop" checked={!loop} onChange={() => setLoop(false)} className="form-radio bg-yt-dark-tertiary text-yt-red" /> Play Once</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-yt-text-secondary mb-2">Scheduling</label>
              <select value={scheduleType} onChange={e => setScheduleType(e.target.value as ScheduleType)} className="w-full bg-yt-dark-tertiary border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none">
                <option value={ScheduleType.Manual}>Manual Start</option>
                <option value={ScheduleType.Recurring}>Recurring (Daily)</option>
                <option value={ScheduleType.Duration}>Duration</option>
              </select>
            </div>
            {scheduleType === ScheduleType.Recurring && (
              <div className="flex gap-4">
                <div><label className="text-sm">Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full mt-1 bg-yt-dark-tertiary rounded p-2" /></div>
                <div><label className="text-sm">End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full mt-1 bg-yt-dark-tertiary rounded p-2" /></div>
              </div>
            )}
            {scheduleType === ScheduleType.Duration && (
              <div className="flex gap-4 items-end">
                <div><label className="text-sm">Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full mt-1 bg-yt-dark-tertiary rounded p-2" /></div>
                <div><label className="text-sm">Duration (hours)</label><input type="number" min="1" max="24" value={durationHours} onChange={e => setDurationHours(Number(e.target.value))} className="w-full mt-1 bg-yt-dark-tertiary rounded p-2" /></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onFinished} className="py-2 px-4 bg-yt-dark-tertiary hover:bg-yt-dark-tertiary/80 font-semibold rounded-lg transition-colors">Cancel</button>
        <button type="submit" disabled={!isFormValid} className="py-2 px-4 bg-yt-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-red-900 disabled:cursor-not-allowed flex items-center gap-2">
            {isSaving && <Loader2 className="w-5 h-5 animate-spin"/>}
            {isSaving ? 'Saving...' : (streamToEdit ? 'Save Changes' : 'Add Stream')}
        </button>
      </div>

      {isGalleryOpen && (
        <Modal title="Select a Video" onClose={() => setIsGalleryOpen(false)}>
            <VideoGallerySelector onSelectVideo={handleVideoSelect} />
        </Modal>
      )}
    </form>
  );
};

export default StreamForm;
