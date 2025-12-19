
export enum StreamStatus {
  Idle = 'Idle',
  Running = 'Running',
  Scheduled = 'Scheduled'
}

export enum ScheduleType {
  Manual = 'Manual',
  Recurring = 'Recurring',
  Duration = 'Duration'
}

export interface Video {
  id: string;
  name: string;
  duration: string; // e.g., "02:30:15"
  thumbnailUrl: string;
  url: string; // a mock url
}

export interface Stream {
  id: string;
  userId: string;
  title: string;
  rtmpUrl: string;
  streamKey: string;
  video: Video | null;
  loop: boolean;
  scheduleType: ScheduleType;
  schedule?: {
    startTime?: string; // "08:00"
    endTime?: string; // "12:00"
    durationHours?: number; // 4
  };
  status: StreamStatus;
  ffmpegPid?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
}