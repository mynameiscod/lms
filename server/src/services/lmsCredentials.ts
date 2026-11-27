import { canUseLms, WRONG_DOOR_LMS } from './accountProduct';
import User from '../models/User';
import Tenant from '../models/Tenant';

/** First-party OAuth password verification; native LMS lifecycle checks stay in authService. */
export async function authenticateLmsCredentials(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Your account has been deactivated. Please contact your administrator.');
  if (!(await user.comparePassword(password))) throw new Error('Invalid credentials');
  if (!canUseLms(user)) throw new Error(WRONG_DOOR_LMS);
  const tenant = await Tenant.findById(user.tenantId);
  if (user.role !== 'SUPER_ADMIN' && tenant && tenant.isActive === false) {
    throw new Error('Your institute\'s account is not active. Please contact the platform administrator.');
  }
  return { user, tenant };
}
