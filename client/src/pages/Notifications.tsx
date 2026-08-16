import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications as notifApi, foods as foodsApi } from '../services/api';
import type { Notification } from '../types';
import { soundSynth, requestPushPermission, sendBrowserPushNotification } from '../utils/audioAlarm';
import toast from 'react-hot-toast';
import {
  CheckCheck, Volume2, VolumeX,
  Flame, RefreshCw, Sliders, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

type NotifFilter = 'all' | 'urgent' | 'upcoming' | 'unread';

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('fg_alarm_sound') !== 'false';
  });
  const [volume, setVolume] = useState(() => {
    const v = localStorage.getItem('fg_alarm_volume');
    return v ? parseFloat(v) : 0.8;
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [urgentSummary, setUrgentSummary] = useState<{ urgentCount: number; warningCount: number } | null>(null);

  const load = useCallback(async () => {
    try {
      // 1. Run alarm scanner to refresh latest expiration deltas
      const { data: alarmStatus } = await notifApi.checkAlarms();
      setUrgentSummary({
        urgentCount: alarmStatus.urgentCount || 0,
        warningCount: alarmStatus.warningCount || 0,
      });

      // 2. Fetch notifications
      const { data } = await notifApi.list();
      setItems(data);

      // Play alert chime if urgent items exist and sound enabled
      if (soundEnabled && alarmStatus.urgentCount > 0) {
        soundSynth.playUrgentAlarm(volume);
        sendBrowserPushNotification(
          '🚨 Urgent FreshGuard Alarm',
          `You have ${alarmStatus.urgentCount} food item(s) expiring today! Rescue them before they spoil.`
        );
      }
    } catch {
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, volume]);

  useEffect(() => { load(); }, [load]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundSynth.setMasterVolume(newVol);
    localStorage.setItem('fg_alarm_volume', String(newVol));
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('fg_alarm_sound', String(next));
    if (next) {
      soundSynth.playReminderChime(volume);
      toast.success('Alarm chimes enabled! 🔔');
    } else {
      toast('Alarm chimes muted', { icon: '🔇' });
    }
  };

  const handleTestSound = (type: 'urgent' | 'reminder' | 'success') => {
    setIsPlayingAudio(true);
    setTimeout(() => setIsPlayingAudio(false), 1200);

    if (type === 'urgent') {
      soundSynth.playUrgentAlarm(volume);
      toast('Playing Urgent Alarm Sequence 🚨', { icon: '🔊' });
    } else if (type === 'reminder') {
      soundSynth.playReminderChime(volume);
      toast('Playing Reminder Ping 🔔', { icon: '🔊' });
    } else {
      soundSynth.playSuccessChime(volume);
      toast('Playing Rescue Fanfare ✨', { icon: '🔊' });
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      sendBrowserPushNotification('FreshGuard Active 🌿', 'You will now receive automatic expiry alerts!');
      toast.success('Browser push alerts enabled! 📲');
    } else {
      toast.error('Notification permission was dismissed or blocked in browser');
    }
  };

  const markRead = async (id: string) => {
    try {
      await notifApi.markRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notifApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      soundSynth.playSuccessChime(volume);
      toast.success('All notifications marked as read');
    } catch {}
  };

  const handleQuickConsume = async (foodId: string) => {
    try {
      await foodsApi.consume(foodId);
      soundSynth.playSuccessChime(volume);
      toast.success('Marked as consumed! 🌿');
      load();
    } catch {
      toast.error('Could not update food item');
    }
  };

  const unreadCount = items.filter(n => !n.read).length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredItems = items.filter(item => {
    if (filter === 'unread') return !item.read;
    if (filter === 'urgent') return item.type === 'URGENT' || item.type === 'EXPIRED';
    if (filter === 'upcoming') return item.type === 'REMINDER';
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Alerts & Alarm Center</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Real-time acoustic alarms, push alerts & pantry monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="btn-ghost p-2 text-gray-500 hover:text-gray-900"
            title="Refresh alarms"
          >
            <RefreshCw size={16} />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-ghost text-xs flex items-center gap-1.5 font-bold text-emerald-800">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* 🚨 Urgent Ringing Alarm Banner */}
      {urgentSummary && urgentSummary.urgentCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white rounded-3xl p-5 shadow-xl shadow-red-600/20 relative overflow-hidden"
        >
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 animate-bounce">
                🚨
              </div>
              <div>
                <div className="font-extrabold text-base leading-tight">
                  {urgentSummary.urgentCount} Food Item{urgentSummary.urgentCount > 1 ? 's' : ''} Expiring Today!
                </div>
                <p className="text-xs text-red-100 mt-1 leading-relaxed">
                  Immediate action recommended. Use AI Rescue to transform them into dinner before they spoil.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-4 pt-3.5 border-t border-white/20 relative z-10">
            <button
              onClick={() => navigate('/rescue')}
              className="bg-white text-red-700 hover:bg-red-50 text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Flame size={14} className="text-orange-500" /> Generate AI Rescue Recipes
            </button>
            <button
              onClick={() => handleTestSound('urgent')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2.5 px-3.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Volume2 size={14} /> Replay Alarm Sound
            </button>
          </div>
        </motion.div>
      )}

      {/* Sound & Notification Controls Panel */}
      <div className="fresh-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80 shadow-xs'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} className="text-emerald-700" /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Alarm Sound: ON' : 'Alarm Sound: Muted'}</span>
            </button>

            <button
              onClick={handleEnablePush}
              className="btn-ghost text-xs text-gray-600 font-semibold hover:text-emerald-800"
            >
              📲 Enable Push Alerts
            </button>
          </div>

          {/* Audio Test Chimes */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-bold mr-1 uppercase tracking-wider">Test Chimes:</span>
            <button
              onClick={() => handleTestSound('reminder')}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
            >
              🔔 Ping
            </button>
            <button
              onClick={() => handleTestSound('urgent')}
              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
            >
              🚨 Urgent
            </button>
            <button
              onClick={() => handleTestSound('success')}
              className="px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors"
            >
              ✨ Fanfare
            </button>
          </div>
        </div>

        {/* Volume Slider & Audio Wave Indicator */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Sliders size={13} className="text-gray-400" />
            <span className="text-[11px] text-gray-500 font-semibold min-w-[70px]">Alarm Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-800 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
            />
            <span className="text-[11px] font-bold text-gray-700 w-8">{Math.round(volume * 100)}%</span>
          </div>

          {isPlayingAudio && (
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-1 h-4 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="text-[10px] text-emerald-700 font-bold ml-1">Ringing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-gray-100/90 p-1 rounded-2xl max-w-md">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'urgent', label: '🚨 Urgent' },
          { key: 'upcoming', label: '🔔 Upcoming' },
          { key: 'unread', label: `Unread (${unreadCount})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key as NotifFilter)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === t.key ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-gray-100 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl">
            🌿
          </div>
          <div className="font-bold text-gray-800 text-sm">No notifications in this filter</div>
          <p className="text-xs text-gray-400 mt-1">Your pantry items are organized and tracked</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(n => {
            const isUrgent = n.type === 'URGENT' || n.type === 'EXPIRED';
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !n.read && markRead(n.id)}
                className={`fresh-card flex items-start gap-4 p-4 cursor-pointer transition-all ${
                  !n.read
                    ? isUrgent
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-emerald-200 bg-emerald-50/20'
                    : ''
                }`}
              >
                <div className="text-2xl shrink-0 mt-0.5">
                  {isUrgent ? '🚨' : n.type === 'REMINDER' ? '🔔' : '📣'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <span>{n.title}</span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium shrink-0">
                      {formatTime(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>

                  {/* Action Link for urgent notifications */}
                  <div className="mt-3 flex items-center gap-2">
                    {isUrgent && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/rescue'); }}
                        className="text-[11px] font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-xl border border-orange-200 transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Flame size={12} className="text-orange-500" /> Rescue Recipe
                      </button>
                    )}

                    {n.food_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickConsume(n.food_id!); }}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 size={12} className="text-emerald-600" /> Consume Now
                      </button>
                    )}

                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 ml-auto"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
