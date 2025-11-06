export interface PublicPresentation {
  id: string;
  slug?: string;
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
  image?: string;
  presentationCount: number;
}

