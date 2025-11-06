import { UserProfile } from './types';

interface UserProfileHeaderProps {
  profile: UserProfile;
  presentationCount: number;
}

export function UserProfileHeader({ profile, presentationCount }: UserProfileHeaderProps) {
  return (
    <div className="mb-12">
      <div className="flex items-start gap-6 mb-6">
        {/* Profile Picture */}
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name || profile.username}
            className="w-24 h-24 rounded-full object-cover border-2 border-white/20 flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl text-[var(--lume-mist)]/50">
              {(profile.name || profile.username).charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Profile Info */}
        <div className="flex-1">
          <h1 className="mb-2 text-4xl font-light text-white">
            {profile.name || profile.username}&apos;s Presentations
          </h1>
          {profile.bio && (
            <p className="mt-4 text-lg text-[var(--lume-mist)]/80 max-w-2xl">
              {profile.bio}
            </p>
          )}
          <p className="mt-2 text-[var(--lume-mist)]/70">
            {presentationCount} {presentationCount === 1 ? 'public presentation' : 'public presentations'}
          </p>
        </div>
      </div>
    </div>
  );
}

