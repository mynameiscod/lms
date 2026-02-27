export interface IUser {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITenant {
  _id?: string;
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  website?: string;
  adminId: string;
  isActive: boolean;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICourse {
  _id?: string;
  title: string;
  description: string;
  instructor: string;
  tenantId: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  enrollmentCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILesson {
  _id?: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEnrollment {
  _id?: string;
  userId: string;
  courseId: string;
  tenantId: string;
  status: 'enrolled' | 'completed' | 'dropped';
  progress: number;
  enrolledAt: Date;
  completedAt?: Date;
}

export interface IRole {
  _id?: string;
  name: string;
  permissions: string[];
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: IUser;
  tenant: ITenant;
}