import User from '../models/User';
import Tenant from '../models/Tenant';

/** Shared password verification for LMS login and first-party OAuth login. */
export async function authenticateLmsCredentials(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Your account has been deactivated. Please contact your administrator.');
  if (!(await user.comparePassword(password))) throw new Error('Invalid credentials');
  const tenant = await Tenant.findById(user.tenantId);
  if (user.role !== 'SUPER_ADMIN' && tenant && tenant.isActive === false) {
    throw new Error('Your institute\'s account is not active. Please contact the platform administrator.');
  }
  return { user, tenant };
}
