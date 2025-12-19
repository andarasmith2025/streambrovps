import React from 'react';
import { KeyRound, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Settings: React.FC = () => {
    const { user } = useAppContext();

    return (
        <div className="container mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold text-yt-text-primary mb-6">Profile & Settings</h1>
            
            <div className="bg-yt-dark-secondary p-6 rounded-xl space-y-8">
                <div>
                    <h2 className="text-xl font-semibold text-yt-text-primary border-b border-yt-dark-tertiary pb-2 mb-4">Account Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-yt-text-secondary mb-1">Username</label>
                            <input type="text" value={user?.username || ''} className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" readOnly />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-yt-text-secondary mb-1">Email</label>
                            <input type="email" value={user?.email || ''} className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" readOnly />
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-yt-text-primary border-b border-yt-dark-tertiary pb-2 mb-4">Change Password</h2>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-yt-text-secondary mb-1">Current Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-yt-text-secondary mb-1">New Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-yt-text-primary border-b border-yt-dark-tertiary pb-2 mb-4">API Keys</h2>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-yt-text-secondary mb-1">YouTube API Key (Optional)</label>
                            <div className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-yt-text-secondary" />
                                <input type="password" placeholder="Enter your YouTube API Key" className="w-full bg-yt-dark-tertiary border border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4">
                     <button className="flex items-center gap-2 bg-yt-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        <Save className="h-5 w-5" />
                        <span>Save Settings</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;