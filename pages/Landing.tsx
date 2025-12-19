import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Zap, CalendarClock, Video } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="bg-yt-dark min-h-screen text-yt-text-primary font-sans">
      <header className="container mx-auto flex justify-between items-center p-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Youtube className="h-8 w-8 text-yt-red" />
          <span>StreamBro</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="font-medium text-yt-text-secondary hover:text-yt-text-primary transition-colors">
            Login
          </Link>
          <Link to="/register" className="bg-yt-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="container mx-auto text-center px-6 py-20 sm:py-32">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Effortless <span className="text-yt-red">YouTube</span> Live Streaming
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-yt-text-secondary">
          Schedule, loop, and manage your pre-recorded videos as 24/7 live streams with an intuitive and powerful dashboard.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register" className="bg-yt-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 text-lg">
            Get Started for Free
          </Link>
        </div>
      </main>

      <section className="bg-yt-dark-secondary py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why StreamBro?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-yt-dark p-8 rounded-xl text-center">
              <Zap className="h-12 w-12 mx-auto text-yt-red mb-4" />
              <h3 className="text-xl font-bold mb-2">24/7 Automation</h3>
              <p className="text-yt-text-secondary">
                Set your stream to loop indefinitely. Perfect for lofi radio, music streams, or continuous content.
              </p>
            </div>
            <div className="bg-yt-dark p-8 rounded-xl text-center">
              <CalendarClock className="h-12 w-12 mx-auto text-yt-red mb-4" />
              <h3 className="text-xl font-bold mb-2">Advanced Scheduling</h3>
              <p className="text-yt-text-secondary">
                Plan your streams with recurring schedules or set them to run for a specific duration. Set it and forget it.
              </p>
            </div>
            <div className="bg-yt-dark p-8 rounded-xl text-center">
              <Video className="h-12 w-12 mx-auto text-yt-red mb-4" />
              <h3 className="text-xl font-bold mb-2">Video Management</h3>
              <p className="text-yt-text-secondary">
                Upload and manage your video library directly within the app. Easily assign videos to different streams.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="container mx-auto text-center py-8 text-yt-text-secondary">
        <p>&copy; {new Date().getFullYear()} StreamBro. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;