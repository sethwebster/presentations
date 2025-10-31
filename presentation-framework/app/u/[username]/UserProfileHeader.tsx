import { UserProfile } from './types';

interface UserProfileHeaderProps {
  profile: UserProfile;
  presentationCount: number;
}

export function UserProfileHeader({ profile, presentationCount }: UserProfileHeaderProps) {
  return (
    <div className="mb-12">
      <div className="mb-6">
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
  );
}

