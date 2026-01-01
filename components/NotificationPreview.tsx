
import React from 'react';
import { NotificationConfig, Platform } from '../types';
import { Bell, X, Info, Settings } from 'lucide-react';

interface PreviewProps {
  config: NotificationConfig;
  platform: Platform;
}

const NotificationPreview: React.FC<PreviewProps> = ({ config, platform }) => {
  const { title, body, icon } = config;

  if (platform === Platform.MACOS) {
    return (
      <div className="w-[360px] bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-4 text-gray-900 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden">
            {icon ? <img src={icon} alt="icon" className="w-full h-full object-cover" /> : <Bell size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-sm truncate">{title || 'Notification Title'}</h4>
              <span className="text-[10px] text-gray-400 font-medium">NOW</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-3 leading-relaxed">
              {body || 'Your message will appear here...'}
            </p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
           <button className="px-3 py-1 bg-gray-100/50 hover:bg-gray-200/50 rounded text-[11px] font-medium transition-colors">Options</button>
           <button className="px-3 py-1 bg-gray-100/50 hover:bg-gray-200/50 rounded text-[11px] font-medium transition-colors">Clear</button>
        </div>
      </div>
    );
  }

  if (platform === Platform.WINDOWS) {
    return (
      <div className="w-[360px] bg-[#202020] border border-[#333333] shadow-2xl p-4 text-white relative animate-in fade-in slide-in-from-right-4 duration-500 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 flex items-center justify-center shrink-0 rounded-sm">
            {icon ? <img src={icon} alt="icon" className="w-full h-full object-cover" /> : <Info size={24} />}
          </div>
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-semibold tracking-wide uppercase text-blue-400 mb-1">APP NAME</h4>
            <h3 className="text-sm font-bold mb-1 line-clamp-1">{title || 'New Notification'}</h3>
            <p className="text-xs text-gray-300 leading-normal line-clamp-2">
              {body || 'Configure your message content in the sidebar.'}
            </p>
          </div>
        </div>
        <button className="absolute top-2 right-2 text-gray-500 hover:text-white p-1">
          <X size={16} />
        </button>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[11px] font-medium border border-[#444] transition-colors">Dismiss</button>
          <button className="flex-1 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[11px] font-medium border border-[#444] transition-colors">Settings</button>
        </div>
      </div>
    );
  }

  // Generic Browser Style
  return (
    <div className="w-[320px] bg-[#1e293b] rounded-lg shadow-xl border border-slate-700/50 p-3 text-slate-100 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-600 flex items-center justify-center">
            <Settings size={10} />
          </div>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">Notification System</span>
        </div>
        <X size={12} className="text-slate-500 cursor-pointer" />
      </div>
      <div className="flex gap-3">
        {icon && <img src={icon} alt="icon" className="w-12 h-12 rounded object-cover shrink-0" />}
        {!icon && <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center shrink-0"><Bell size={20} /></div>}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold truncate">{title || 'Untitled'}</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
            {body || 'Description text goes here...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreview;
