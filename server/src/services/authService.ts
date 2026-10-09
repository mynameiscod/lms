import jwt from 'jsonwebtoken';
import { onboardTenant } from './tenantOnboardingService';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Tenant from '../models/Tenant';
import Role from '../models/Role';
import { ROLE_PERMISSIONS } from '../middleware/roleGuard';
import { jwtSecret } from '../config/secrets';

export class AuthService {
  async registerOrganizationFull(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    organizationName: string,
    options?: {
      studentFeatures?: Record<string, boolean>;
      modules?: Record<string, boolean>;
      type?: string;
      subscriptionPlan?: string;
    }
  ): Promise<IUser> {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const slug = organizationName.toLowerCase().replace(/\s+/g, '-');
    const existingTenant = await Tenant.findOne({ $or: [{ slug }, { name: organizationName }] });
    if (existingTenant) {
      throw new Error('An organization with this name already exists');
    }

    const placeholderAdminId = new mongoose.Types.ObjectId();
    const tenantData: Record<string, any> = {
      name: organizationName,
      slug,
      adminId: placeholderAdminId,
      isActive: true,
      subscriptionPlan: options?.subscriptionPlan || 'free',
      type: options?.type || 'institute',
    };
    if (options?.studentFeatures) tenantData.studentFeatures = options.studentFeatures;
    if (options?.modules) tenantData.modules = options.modules;

    const tenant = new Tenant(tenantData);
    await tenant.save();

    const user = new User({
      email,
      firstName,
      lastName,
      password,
      tenantId: tenant._id,
      role: 'TENANT_ADMIN'
    });
    await user.save();

    await Tenant.findByIdAndUpdate(tenant._id, { adminId: user._id });
    // Default setup (lead pipeline etc.) so the new institute does not start with empty screens.
    await onboardTenant(String(tenant._id)).catch((e) => console.error('[onboarding] setup failed', e?.message));

    return user;
  }

  async register(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    tenantIdentifier: string,
    studentFeatures?: Record<string, boolean>
  ): Promise<IUser> {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    let tenantId: mongoose.Types.ObjectId;
    let isNewTenant = false;

    // Check if tenantIdentifier is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(tenantIdentifier)) {
      const tenant = await Tenant.findById(tenantIdentifier);
      if (tenant) {
        tenantId = tenant._id as mongoose.Types.ObjectId;
      } else {
        throw new Error('Tenant not found');
      }
    } else {
      // Treat it as a tenant name/slug - look up or create
      const slug = tenantIdentifier.toLowerCase().replace(/\s+/g, '-');
      let tenant = await Tenant.findOne({ 
        $or: [{ slug }, { name: tenantIdentifier }] 
      });

      // Self-registration can only JOIN an existing institute. Creating one is a SaaS-admin
      // action (register-organization); this used to create an institute for any unknown name
      // and make the caller its TENANT_ADMIN.
      if (!tenant) {
        throw new Error('Institute not found. Use the sign-up link your institute gave you.');
      }
      tenantId = tenant._id as mongoose.Types.ObjectId;
    }

    // If user is creating a new tenant, make them TENANT_ADMIN
    // Otherwise, they're joining an existing tenant as STUDENT
    const userRole = isNewTenant ? 'TENANT_ADMIN' : 'STUDENT';

    // A deactivated institute takes no new sign-ups.
    const joining: any = await Tenant.findById(tenantId).select('isActive').lean();
    if (!joining || joining.isActive === false) {
      throw new Error('This institute is not accepting sign-ups.');
    }

    const user = new User({
      email,
      firstName,
      lastName,
      password,
      tenantId,
      role: userRole
    });

    await user.save();

    // Update tenant's adminId to the new user if they created the tenant
    if (isNewTenant) {
      await Tenant.findByIdAndUpdate(tenantId, { adminId: user._id });
    }

    return user;
  }

  async login(email: string, password: string): Promise<any> {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new Error('Your account has been deactivated. Please contact your administrator.');
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const tenant = await Tenant.findById(user.tenantId);
    // A deactivated institute is locked out entirely (the platform administrator is not).
    if (user.role !== 'SUPER_ADMIN' && tenant && (tenant as any).isActive === false) {
      throw new Error('Your institute\'s account is not active. Please contact the platform administrator.');
    }

    const secret = jwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    // Type assertion to bypass TypeScript strict checks
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenantId 
      },
      secret as string,
      { expiresIn } as any
    );

    // Resolve effective permissions
    let permissions: string[] = [];
    if (user.customRoleId) {
      try {
        const customRole = await Role.findById(user.customRoleId);
        permissions = customRole ? customRole.permissions : (ROLE_PERMISSIONS[user.role] || []);
      } catch {
        permissions = ROLE_PERMISSIONS[user.role] || [];
      }
    } else {
      permissions = ROLE_PERMISSIONS[user.role] || [];
    }

    return { 
      token, 
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        customRoleId: user.customRoleId || null,
        isActive: user.isActive,
        // Student screens (attendance, batch work) key off this. Without it a student who
        // logged in and went straight to My Attendance saw 0 classes until a page reload.
        batchId: (user as any).batchId || null,
        permissions
      },
      tenant 
    };
  }
}