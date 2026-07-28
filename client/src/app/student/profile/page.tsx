'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, AlertCircle, Edit2, Lock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileData {
  id: number;
  email: string;
  created_at: string;
  first_name: string;
  last_name: string;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  bio: string | null;
  profile_image_url: string | null;
}

interface Skill {
  id: number;
  name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProfileData>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Avatar Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Skills state
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const [profileRes, skillsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/skills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (!profileRes.ok) throw new Error('Failed to load profile');
      
      const profileData = await profileRes.json();
      setProfile(profileData.profile);
      setEditForm(profileData.profile);

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        setSkills(skillsData.skills || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (field: keyof ProfileData, value: string | number | null) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSaveMessage(null);

    // Validate grad year
    if (editForm.graduation_year) {
      const year = Number(editForm.graduation_year);
      if (isNaN(year) || year < 1900 || year > 2100) {
        setSaveMessage({ type: 'error', text: 'Please enter a valid 4-digit graduation year.' });
        return;
      }
    }

    setSaveLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          university: editForm.university,
          major: editForm.major,
          graduation_year: editForm.graduation_year,
          bio: editForm.bio
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfile(editForm as ProfileData);
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update local storage user data so navbar updates
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userObj.first_name = editForm.first_name;
        userObj.last_name = editForm.last_name;
        localStorage.setItem('user', JSON.stringify(userObj));
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Do NOT set Content-Type here, let the browser set the boundary for multipart/form-data
        },
        body: formData
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setProfile(prev => prev ? { ...prev, profile_image_url: data.profile_image_url } : null);
      
      // Update local storage user data so navbar updates avatar
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userObj.profile_image_url = data.profile_image_url;
        localStorage.setItem('user', JSON.stringify(userObj));
        // dispatch event to force navbar re-render if we were using a custom event
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete account');
      }

      // Success
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleteLoading(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    
    setAddingSkill(true);
    setSkillError(null);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/skills`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newSkill.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add skill');
      
      setSkills(prev => [...prev, data.skill]);
      setNewSkill('');
    } catch (err: any) {
      setSkillError(err.message);
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/students/me/skills/${skillId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove skill');
      setSkills(prev => prev.filter(s => s.id !== skillId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl animate-pulse space-y-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-white/10"></div>
            <div className="space-y-4 flex-1">
              <div className="h-6 w-1/3 bg-white/10 rounded"></div>
              <div className="h-4 w-1/4 bg-white/10 rounded"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-full bg-white/10 rounded"></div>
            <div className="h-4 w-5/6 bg-white/10 rounded"></div>
            <div className="h-4 w-4/6 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center max-w-md w-full">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">Session Expired or Error</h3>
          <p className="text-gray-400 mb-4">{error || 'Unable to load profile data.'}</p>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 pt-28">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header / Identity Block */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl relative shadow-2xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div 
                className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/10 bg-blue-900 flex flex-shrink-0 items-center justify-center group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-blue-100">{initials}</span>
                )}
                
                {/* Hover / Loading overlay */}
                <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white/80" />
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              {uploadError && (
                <p className="mt-2 text-xs text-red-400 max-w-[120px] text-center">{uploadError}</p>
              )}
            </div>

            {/* Identity Info */}
            <div className="flex-1 text-center md:text-left space-y-2 mt-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {profile.first_name} {profile.last_name}
              </h1>
              <div>
                <p className="text-gray-300">{profile.email}</p>
                <p className="text-xs text-gray-500 italic mt-0.5">Email cannot be changed</p>
              </div>
              <p className="text-sm text-gray-400 pt-2 flex items-center justify-center md:justify-start">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                Member since {memberSince}
              </p>
            </div>

            {/* Edit Toggle Button */}
            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full md:w-auto bg-white/5 border-white/10 hover:bg-white/10 text-white mt-4 md:mt-0"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Success/Error Message for saving */}
        {saveMessage && (
          <div className={`p-4 rounded-lg border ${saveMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} flex items-center`}>
            {saveMessage.type === 'error' && <AlertCircle className="w-5 h-5 mr-3" />}
            {saveMessage.text}
          </div>
        )}

        {/* Editable Profile Fields */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Personal Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* View Mode */}
            {!isEditing ? (
              <>
                <div>
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">University</Label>
                  <p className="text-white mt-1 font-medium">{profile.university || <span className="text-gray-500 font-normal italic">Not set</span>}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">Major</Label>
                  <p className="text-white mt-1 font-medium">{profile.major || <span className="text-gray-500 font-normal italic">Not set</span>}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">Graduation Year</Label>
                  <p className="text-white mt-1 font-medium">{profile.graduation_year || <span className="text-gray-500 font-normal italic">Not set</span>}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">Bio</Label>
                  <p className="text-white mt-1 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio || <span className="text-gray-500 font-normal italic">Not set</span>}</p>
                </div>
              </>
            ) : (
              /* Edit Mode */
              <>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-gray-300">First Name</Label>
                  <Input 
                    value={editForm.first_name || ''} 
                    onChange={(e) => handleEditChange('first_name', e.target.value)}
                    className="bg-black/40 border-white/10 text-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-gray-300">Last Name</Label>
                  <Input 
                    value={editForm.last_name || ''} 
                    onChange={(e) => handleEditChange('last_name', e.target.value)}
                    className="bg-black/40 border-white/10 text-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">University</Label>
                  <Input 
                    value={editForm.university || ''} 
                    onChange={(e) => handleEditChange('university', e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="bg-black/40 border-white/10 text-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Major</Label>
                  <Input 
                    value={editForm.major || ''} 
                    onChange={(e) => handleEditChange('major', e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="bg-black/40 border-white/10 text-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300">Graduation Year</Label>
                  <Input 
                    type="number"
                    value={editForm.graduation_year || ''} 
                    onChange={(e) => handleEditChange('graduation_year', e.target.value)}
                    placeholder="e.g. 2027"
                    className="bg-black/40 border-white/10 text-white focus:border-blue-500 max-w-[200px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300">Bio</Label>
                  <textarea 
                    value={editForm.bio || ''} 
                    onChange={(e) => handleEditChange('bio', e.target.value)}
                    placeholder="Tell us a bit about your career goals..."
                    className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-md p-3 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                  />
                </div>
              </>
            )}
          </div>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setEditForm(profile); // Revert changes
                  setIsEditing(false);
                  setSaveMessage(null);
                }}
                className="text-gray-400 hover:text-white hover:bg-white/5"
                disabled={saveLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                disabled={saveLoading}
              >
                {saveLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Skills</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {skills.map(skill => (
              <div 
                key={skill.id}
                className="bg-blue-500/10 border border-blue-500/20 text-blue-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
              >
                {skill.name}
                <button 
                  onClick={() => handleRemoveSkill(skill.id)}
                  className="text-blue-400 hover:text-white transition-colors focus:outline-none"
                  title="Remove skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-gray-400 text-sm italic">No skills added yet.</p>
            )}
          </div>

          <form onSubmit={handleAddSkill} className="flex gap-2 max-w-sm relative">
            <Input 
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a new skill..."
              className="bg-black/40 border-white/10 text-white focus:border-blue-500 flex-1"
              disabled={addingSkill}
            />
            <Button 
              type="submit"
              disabled={!newSkill.trim() || addingSkill}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addingSkill ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
            {skillError && (
              <p className="absolute -bottom-6 left-0 text-xs text-red-400">{skillError}</p>
            )}
          </form>
        </div>

        {/* Account Actions Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => setShowPasswordModal(true)}
              className="bg-white/10 hover:bg-white/15 text-white border-0 justify-start"
            >
              <Lock className="w-4 h-4 mr-3 text-gray-400" />
              Change Password
            </Button>

            <Button 
              onClick={() => setShowDeleteModal(true)}
              className="bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 justify-start"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Delete Account
            </Button>
          </div>
        </div>

      </div>

      {/* Change Password Modal (Placeholder) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <Lock className="w-10 h-10 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Change Password</h3>
            <p className="text-gray-400 text-sm mb-6">
              Password reset functionality is coming soon. Please check back later.
            </p>
            <Button onClick={() => setShowPasswordModal(false)} className="w-full bg-blue-600 hover:bg-blue-700">
              Understood
            </Button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Account</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete your account? This will deactivate your account and you'll be logged out. This action can be reversed by contacting support.
            </p>
            
            {deleteError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-300 hover:text-white hover:bg-white/5"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteLoading}
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Yes, delete my account
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
