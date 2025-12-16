
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, LogOut, Calendar, Star, TrendingUp, Settings, Shield, Bell, 
    Edit2, Save, X, Camera, Check, Lock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    getFavorites, getTopPitchers, updateUserProfile, 
    updateUserPreferences, changePassword 
} from '../services/api';
import { Pitcher, User as UserType, UserPreferences } from '../types';
import { MLB_TEAMS } from '../constants';

// --- Sub-Components ---

const UserStatsCard: React.FC<{ user: UserType, favoriteCount: number }> = ({ user, favoriteCount }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 relative group">
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover border-4 border-slate-800 shadow-lg" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-lg">
                         <span className="text-3xl font-bold text-white uppercase">{user.username.substring(0,2)}</span>
                    </div>
                )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-1">
                <h1 className="text-3xl font-bold text-white">{user.display_name || user.username}</h1>
                <p className="text-slate-400">@{user.username}</p>
                {user.favorite_team && (
                    <span className="inline-block bg-slate-800 text-blue-400 text-xs px-2 py-1 rounded font-medium border border-slate-700 mt-1">
                        Fan of {user.favorite_team}
                    </span>
                )}
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-slate-500 mt-3 pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>Joined {new Date(user.joined_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Star size={14} />
                        <span>{favoriteCount} Favorites</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const EditProfileSection: React.FC<{ user: UserType, onUpdate: (u: UserType) => void }> = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        display_name: user.display_name || '',
        favorite_team: user.favorite_team || '',
        avatar_url: user.avatar_url || ''
    });
    
    const handleSave = async () => {
        setIsLoading(true);
        try {
            const updatedUser = await updateUserProfile(user.id, formData);
            onUpdate(updatedUser);
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    const simulateUpload = () => {
        // Mock upload delay and URL generation
        const mockUrls = [
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80", 
            "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=150&q=80"
        ];
        const randomUrl = mockUrls[Math.floor(Math.random() * mockUrls.length)];
        setFormData({ ...formData, avatar_url: randomUrl });
    };

    if (!isEditing) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Profile Details
                    </h3>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-semibold">Display Name</label>
                        <p className="text-slate-200 mt-1 font-medium">{user.display_name || user.username}</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-semibold">Email</label>
                        <p className="text-slate-200 mt-1 font-medium">{user.email}</p>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-semibold">Favorite Team</label>
                        <p className="text-slate-200 mt-1 font-medium">{user.favorite_team || 'Not set'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-6">Edit Profile</h3>
            
            <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-4 mb-4">
                     <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden border border-slate-600">
                        {formData.avatar_url ? (
                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={24}/></div>
                        )}
                     </div>
                     <button type="button" onClick={simulateUpload} className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                        <Camera size={16} /> Change Photo
                     </button>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Display Name</label>
                    <input 
                        type="text" 
                        value={formData.display_name} 
                        onChange={e => setFormData({...formData, display_name: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Favorite Team</label>
                    <select 
                        value={formData.favorite_team}
                        onChange={e => setFormData({...formData, favorite_team: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Select a team...</option>
                        {MLB_TEAMS.map(team => (
                            <option key={team} value={team}>{team}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {isLoading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                    </button>
                    <button 
                        onClick={() => setIsEditing(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const PreferencesSection: React.FC<{ user: UserType, onUpdate: (u: UserType) => void }> = ({ user, onUpdate }) => {
    const [prefs, setPrefs] = useState<UserPreferences>(user.preferences);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const toggle = (key: keyof UserPreferences) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key as any] }));
    };

    const savePrefs = async () => {
        setIsSaving(true);
        try {
            const updatedUser = await updateUserPreferences(user.id, prefs);
            onUpdate(updatedUser);
            setMsg('Preferences updated!');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            console.error(e);
            setMsg('Error saving preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <Settings size={20} className="text-emerald-400" />
                Preferences
            </h3>
            
            <div className="space-y-6">
                {/* Units */}
                <div>
                    <label className="text-sm font-semibold text-slate-300 mb-2 block">Measurement Units</label>
                    <div className="flex bg-slate-800 p-1 rounded-lg w-full max-w-xs border border-slate-700">
                        <button
                            onClick={() => setPrefs(p => ({ ...p, measurement_unit: 'imperial' }))}
                            className={`flex-1 py-1.5 text-sm rounded-md transition-all ${prefs.measurement_unit === 'imperial' ? 'bg-slate-600 text-white shadow' : 'text-slate-400'}`}
                        >
                            Imperial (MPH)
                        </button>
                        <button
                            onClick={() => setPrefs(p => ({ ...p, measurement_unit: 'metric' }))}
                            className={`flex-1 py-1.5 text-sm rounded-md transition-all ${prefs.measurement_unit === 'metric' ? 'bg-slate-600 text-white shadow' : 'text-slate-400'}`}
                        >
                            Metric (KM/H)
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div>
                    <label className="text-sm font-semibold text-slate-300 mb-2 block">Email Notifications</label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${prefs.email_qs_alerts ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <input type="checkbox" className="hidden" checked={prefs.email_qs_alerts} onChange={() => toggle('email_qs_alerts')} />
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.email_qs_alerts ? 'left-5' : 'left-1'}`}></div>
                            </div>
                            <span className="text-slate-400 group-hover:text-slate-200 transition-colors text-sm">QS Alerts for my favorite pitchers</span>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-6 rounded-full relative transition-colors ${prefs.email_marketing ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <input type="checkbox" className="hidden" checked={prefs.email_marketing} onChange={() => toggle('email_marketing')} />
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.email_marketing ? 'left-5' : 'left-1'}`}></div>
                            </div>
                            <span className="text-slate-400 group-hover:text-slate-200 transition-colors text-sm">Product updates & newsletters</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                    <button 
                        onClick={savePrefs}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                    {msg && <span className={`text-sm ${msg.includes('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>{msg}</span>}
                </div>
            </div>
        </div>
    );
};

const SecuritySection: React.FC<{ user: UserType }> = ({ user }) => {
    const [form, setForm] = useState({ current: '', new: '', confirm: '' });
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'idle', msg: '' });

        if (form.new.length < 6) {
            setStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
            return;
        }
        if (form.new !== form.confirm) {
            setStatus({ type: 'error', msg: 'New passwords do not match.' });
            return;
        }

        setLoading(true);
        try {
            await changePassword(user.id, form.current, form.new);
            setStatus({ type: 'success', msg: 'Password changed successfully.' });
            setForm({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message || 'Failed to change password.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <Shield size={20} className="text-rose-400" />
                Security
            </h3>
            
            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Current Password</label>
                    <input 
                        type="password" 
                        required
                        value={form.current}
                        onChange={e => setForm({...form, current: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">New Password</label>
                    <input 
                        type="password" 
                        required
                        value={form.new}
                        onChange={e => setForm({...form, new: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
                    <input 
                        type="password" 
                        required
                        value={form.confirm}
                        onChange={e => setForm({...form, confirm: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                </div>

                {status.msg && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {status.type === 'success' ? <Check size={16} /> : <X size={16} />}
                        {status.msg}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors mt-2"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Lock size={16} />}
                    Update Password
                </button>
            </form>
        </div>
    );
};

const FavoritesList: React.FC<{ favorites: Pitcher[], navigate: (p:string) => void }> = ({ favorites, navigate }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <Star size={20} className="text-yellow-400" />
            Watchlist
        </h3>
        
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No favorites yet.</p>
            <button onClick={() => navigate('/')} className="text-blue-400 hover:underline mt-2 text-sm">Browse Pitchers</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favorites.map((pitcher) => (
              <div 
                key={pitcher.name} 
                onClick={() => navigate(`/pitcher/${pitcher.name}`)}
                className="group bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer flex items-center gap-4"
              >
                  <img src={pitcher.image_url} alt={pitcher.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-blue-400">{pitcher.name}</h4>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                       <span>{pitcher.team}</span>
                       <span className={`font-bold ${
                          (pitcher.qs_probability || 0) > 75 ? 'text-emerald-400' : 'text-slate-500'
                       }`}>
                          {(pitcher.qs_probability * 100).toFixed(1)}% QS
                       </span>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
    </div>
);

// --- Main Page Component ---

export const ProfilePage: React.FC = () => {
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Pitcher[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'security'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const [favIds, allPitchers] = await Promise.all([
          getFavorites(user.id),
          getTopPitchers()
        ]);
        console.log("Favorite IDs:", favIds);
        console.log("All Pitchers:", allPitchers);  
        const userFavs = allPitchers.filter(p => favIds.includes(p.name));
        console.log(userFavs);
        setFavorites(userFavs);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Top Section */}
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
          {/* Main Stats Card (Always Visible) */}
          <div className="flex-1">
             <UserStatsCard user={user} favoriteCount={favorites.length} />
          </div>
          
          {/* Action Menu */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl w-full md:w-64 flex flex-col gap-2 h-fit">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <TrendingUp size={18} /> Overview
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Settings size={18} /> Profile & Prefs
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Shield size={18} /> Security
              </button>
              
              <div className="h-px bg-slate-800 my-1 mx-2"></div>
              
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <LogOut size={18} /> Sign Out
              </button>
          </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left/Main Column */}
          <div className="lg:col-span-2 space-y-8">
             {activeTab === 'overview' && (
                 <>
                    <FavoritesList favorites={favorites} navigate={navigate} />
                    {/* Add more overview widgets here later */}
                 </>
             )}

             {activeTab === 'settings' && (
                 <>
                    <EditProfileSection user={user} onUpdate={updateUser} />
                    <PreferencesSection user={user} onUpdate={updateUser} />
                 </>
             )}

             {activeTab === 'security' && (
                 <SecuritySection user={user} />
             )}
          </div>

          {/* Right Column / Sidebar Info */}
          <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Bell size={16} className="text-blue-400" />
                      Notifications
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                     {user.preferences.email_qs_alerts 
                        ? "You are currently receiving email alerts for Quality Start predictions." 
                        : "Enable alerts in Settings to get notified about high-probability QS matchups."}
                  </p>
              </div>

              <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-xl p-6">
                  <h4 className="text-white font-bold mb-2">Pro Tip</h4>
                  <p className="text-sm text-indigo-200">
                      Updating your favorite team helps us personalize your dashboard highlights.
                  </p>
              </div>
          </div>

      </div>
    </div>
  );
};
