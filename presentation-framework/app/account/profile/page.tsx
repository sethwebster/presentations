"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user) {
      setUsername(session.user.username || '');
      setName(session.user.name || '');
      setImage((session.user as any).image || '');
    }
  }, [status, session, router]);

  // Debounced username availability check
  useEffect(() => {
    const checkAvailability = async () => {
      const trimmedUsername = username.trim();
      
      // Don't check if empty, or same as current username, or invalid format
      if (!trimmedUsername || trimmedUsername === session?.user?.username) {
        setAvailabilityError(null);
        setCheckingAvailability(false);
        return;
      }

      // Validate format
      const usernameRegex = /^[a-z0-9-]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        setAvailabilityError('Username can only contain lowercase letters, numbers, and hyphens');
        setCheckingAvailability(false);
        return;
      }

      setCheckingAvailability(true);
      setAvailabilityError(null);

      try {
        const response = await fetch(
          `/api/user/check-username?username=${encodeURIComponent(trimmedUsername)}&currentUserId=${encodeURIComponent(session?.user?.id || '')}`
        );
        const data = await response.json();
        
        if (!data.available) {
          setAvailabilityError('This username is already taken');
        } else {
          setAvailabilityError(null);
        }
      } catch (err) {
        console.error('Error checking username availability:', err);
        setAvailabilityError(null); // Don't show error for check failures
      } finally {
        setCheckingAvailability(false);
      }
    };

    const timeoutId = setTimeout(checkAvailability, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [username, session?.user?.username, session?.user?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          username: username.trim() || null,
          name: name.trim() || null,
          image: image || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();

      // Update the session with new data
      await updateSession();

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--lume-midnight)] text-[var(--lume-mist)]">
      <Header />
      <main className="pt-32 max-w-4xl mx-auto px-6 pb-24">
        <Card className="bg-white/[0.04] border border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <button 
                onClick={() => router.back()}
                className="text-[var(--lume-mist)]/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <span>Edit Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Profile Photo */}
            <div className="space-y-2">
              <label className="block text-sm text-[var(--lume-mist)]/70">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {image ? (
                  <img
                    src={image}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-2xl text-[var(--lume-mist)]/50">
                      {name ? name.charAt(0).toUpperCase() : session?.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="profile-photo-upload"
                  />
                  <label
                    htmlFor="profile-photo-upload"
                    className="inline-block px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    {uploadingImage ? 'Uploading...' : 'Choose Photo'}
                  </label>
                  <p className="text-xs text-[var(--lume-mist)]/50 mt-2">
                    Max size: 2MB. Accepted formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm text-[var(--lume-mist)]/70">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-[var(--lume-mist)]/50 focus:outline-none focus:border-[var(--lume-primary)] focus:ring-2 focus:ring-[var(--lume-primary)]/20"
              />
              <p className="text-xs text-[var(--lume-mist)]/50">
                Your display name
              </p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm text-[var(--lume-mist)]/70">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-[var(--lume-mist)]/50 focus:outline-none focus:border-[var(--lume-primary)] focus:ring-2 focus:ring-[var(--lume-primary)]/20"
              />
              <p className="text-xs text-[var(--lume-mist)]/50">
                This will be used in your presentation URLs: /u/[username]
              </p>
              {checkingAvailability && (
                <p className="text-xs text-[var(--lume-mist)]/50">Checking availability...</p>
              )}
              {availabilityError && (
                <p className="text-xs text-red-400">{availabilityError}</p>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3 bg-[var(--lume-primary)]/10 border border-[var(--lume-primary)]/20 rounded-lg">
                <p className="text-sm text-[var(--lume-primary)]">Profile updated successfully!</p>
              </div>
            )}

            {/* Account Info (read-only) */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--lume-mist)]/60">Email</span>
                <span className="text-white">{session.user?.email || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--lume-mist)]/60">Account ID</span>
                <span className="text-white font-mono text-sm">{session.user?.id || 'N/A'}</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 space-y-3">
              <Button
                onClick={handleSave}
                disabled={saving || checkingAvailability || !!availabilityError}
                className="w-full bg-[var(--lume-primary)] text-[var(--lume-midnight)] font-medium hover:bg-[var(--lume-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              {/* Sign Out Button */}
              <Button
                onClick={() => signOut({ callbackUrl: '/' })}
                variant="outline"
                className="w-full border-white/20 text-[var(--lume-mist)] hover:bg-white/5 hover:text-white"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

