export type FaceRating = 'happy' | 'regular' | 'sad';

export interface ProfessorReview {
  id: string;
  author: string;
  courseName: string;
  rating: FaceRating;
  comment: string;
  createdAt: string;
}

export interface Professor {
  id: string;
  name: string;
  department?: string;
  courses: string[];
  favorite: boolean;
  reviews: ProfessorReview[];
  sourceCount?: number;
  sourceAverage?: number;
}
