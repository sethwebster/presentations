export interface PublicPresentation {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
  coverImage?: string;
}

export interface UserProfile {
  username: string;
  name?: string;
  email?: string;
  bio?: string;
  presentationCount: number;
}

