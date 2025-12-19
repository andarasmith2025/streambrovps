import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Stream, Video, StreamStatus, ScheduleType, User } from '../types';

// --- Mock Data ---
const initialVideos: Omit<Video, 'id'>[] = [
    { name: 'Lo-fi Beats to Relax.mp4', duration: '02:30:00', thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg', url: '' },
    { name: 'Smooth Jazz Cafe.mp4', duration: '03:15:22', thumbnailUrl: 'https://i.ytimg.com/vi/kgx4wgK0o-s/maxresdefault.jpg', url: '' },
    { name: 'Ambient Space Music.mp4', duration: '08:00:00', thumbnailUrl: 'https://i.ytimg.com/vi/wnJ6LuUFpMo/maxresdefault.jpg', url: '' }
];

interface AppContextType {
  streams: Stream[];
  videos: Video[];
  addStream: (stream: Omit<Stream, 'id' | 'userId' | 'status'>) => Promise<void>;
  updateStream: (stream: Stream) => Promise<void>;
  deleteStream: (streamId: string) => Promise<void>;
  toggleStreamStatus: (streamId: string, currentStatus: StreamStatus) => Promise<void>;
  addVideo: (video: Omit<Video, 'id'>) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a session
    setTimeout(() => {
      try {
        const storedUser = localStorage.getItem('streambro_user');
        if (storedUser) {
          const loggedInUser = JSON.parse(storedUser);
          setUser(loggedInUser);
          setIsAuthenticated(true);
          // Load mock data on session resume
          loadInitialData(loggedInUser.id);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('streambro_user');
      }
      setIsLoading(false);
    }, 500);
  }, []);

  const loadInitialData = (userId: string) => {
    const loadedVideos = initialVideos.map((v, i) => ({ ...v, id: `video-${i}` }));
    setVideos(loadedVideos);

    const initialStreams: Omit<Stream, 'id'|'userId'>[] = [
        { title: '24/7 Lo-fi Radio', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: 'abc-123', video: loadedVideos[0], loop: true, scheduleType: ScheduleType.Manual, status: StreamStatus.Idle },
        { title: 'Relaxing Jazz Stream', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: 'def-456', video: loadedVideos[1], loop: false, scheduleType: ScheduleType.Recurring, schedule: { startTime: '20:00', endTime: '23:00' }, status: StreamStatus.Scheduled },
    ];
    setStreams(initialStreams.map((s, i) => ({ ...s, id: `stream-${i}`, userId })));
  };

  const addStream = useCallback(async (streamData: Omit<Stream, 'id' | 'userId' | 'status'>): Promise<void> => {
    if (!user) throw new Error("User not authenticated");
    return new Promise(resolve => setTimeout(() => {
        const newStream: Stream = {
            ...streamData,
            id: `stream-${Date.now()}`,
            userId: user.id,
            status: streamData.scheduleType !== ScheduleType.Manual ? StreamStatus.Scheduled : StreamStatus.Idle,
        };
        setStreams(prev => [...prev, newStream]);
        resolve();
    }, 300));
  }, [user]);

  const updateStream = useCallback(async (updatedStream: Stream): Promise<void> => {
     return new Promise(resolve => setTimeout(() => {
        setStreams(prev => prev.map(s => s.id === updatedStream.id ? updatedStream : s));
        resolve();
    }, 300));
  }, []);
  
  const deleteStream = useCallback(async (streamId: string): Promise<void> => {
    return new Promise(resolve => setTimeout(() => {
        setStreams(prev => prev.filter(s => s.id !== streamId));
        resolve();
    }, 300));
  }, []);
  
  const toggleStreamStatus = useCallback(async (streamId: string, currentStatus: StreamStatus): Promise<void> => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream) return;
    const newStatus = currentStatus === StreamStatus.Running ? StreamStatus.Idle : StreamStatus.Running;
    await updateStream({ ...stream, status: newStatus });
  }, [streams, updateStream]);

  const addVideo = useCallback(async (videoData: Omit<Video, 'id'>): Promise<void> => {
    return new Promise(resolve => setTimeout(() => {
        const newVideo: Video = {
            ...videoData,
            id: `video-${Date.now()}`,
        };
        setVideos(prev => [newVideo, ...prev]);
        resolve();
    }, 300));
  }, []);

  const deleteVideo = useCallback(async (videoId: string): Promise<void> => {
    return new Promise(resolve => setTimeout(() => {
        // Also update streams that might be using this video
        setStreams(prevStreams => prevStreams.map(s => 
            s.video?.id === videoId ? { ...s, video: null, status: StreamStatus.Idle } : s
        ));
        setVideos(prevVideos => prevVideos.filter(v => v.id !== videoId));
        resolve();
    }, 300));
  }, []);

  // --- Auth Functions (Mocked) ---
  const login = async (email: string, pass: string): Promise<void> => {
    return new Promise((resolve) => setTimeout(() => {
        const mockUser: User = { id: 'mock-user-123', email, username: email.split('@')[0] || 'StreamBro User' };
        localStorage.setItem('streambro_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setIsAuthenticated(true);
        loadInitialData(mockUser.id);
        resolve();
    }, 500));
  };

  const logout = async (): Promise<void> => {
    return new Promise(resolve => setTimeout(() => {
        localStorage.removeItem('streambro_user');
        setUser(null);
        setIsAuthenticated(false);
        setStreams([]);
        setVideos([]);
        resolve();
    }, 300));
  };

  const register = async (username: string, email: string, pass: string): Promise<void> => {
    // In a real app, you'd check if the user exists. Here, we just log them in.
    return new Promise((resolve) => setTimeout(() => {
        const mockUser: User = { id: `mock-user-${Date.now()}`, email, username };
        localStorage.setItem('streambro_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setIsAuthenticated(true);
        loadInitialData(mockUser.id); // Load initial data for new user as well
        resolve();
    }, 500));
  };

  const value = { 
    streams, 
    videos, 
    addStream, 
    updateStream, 
    deleteStream, 
    toggleStreamStatus, 
    addVideo, 
    deleteVideo, 
    isAuthenticated, 
    user, 
    isLoading,
    login, 
    logout, 
    register 
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};