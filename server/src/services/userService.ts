import User, { IUser } from '../models/User';

export class UserService {
  async createUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    role: string,
    tenantId: string
  ): Promise<IUser> {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user - password will be hashed by pre-save hook
    const user = new User({
      email,
      firstName,
      lastName,
      password,
      role: role || 'STUDENT',
      tenantId,
      isActive: true
    });

    await user.save();
    return user;
  }

  async getAllUsers(tenantId: string): Promise<IUser[]> {
    return await User.find({ tenantId, isActive: true });
  }

  async getUsersByTenant(tenantId: string): Promise<IUser[]> {
    return await User.find({ tenantId, isActive: true });
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  async updateUserRole(userId: string, role: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );
  }

  async changeUserRole(userId: string, role: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );
  }

  async deleteUser(userId: string): Promise<any> {
    return await User.findByIdAndDelete(userId);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async deactivateUser(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
  }

  async activateUser(userId: string): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    );
  }
}