# User Management System

The HTV VC Operating System implements a secure, invitation-only user management system to ensure controlled access to sensitive venture capital data.

## Overview

- **No Public Signup**: Users cannot create accounts themselves
- **Invitation-Only**: All users must be invited by an admin
- **Role-Based Access**: Three roles - Admin, Partner, and Analyst
- **Active/Inactive Status**: Users can be deactivated without deletion
- **Organization-Based**: Multi-tenant architecture with organization isolation

## Initial Setup

### 1. Disable Public Signup in Supabase

Go to your Supabase Dashboard → Authentication → Providers → Email and disable "Enable Signups".

### 2. Run Database Migrations

```bash
npx supabase db push
```

This creates the invitations table and updates the user creation trigger.

### 3. Create First Admin User

Run the setup script to create your initial admin account:

```bash
# Default admin (admin@htv.com / htv-admin-2025)
npx tsx scripts/setup-admin.ts

# Custom admin
npx tsx scripts/setup-admin.ts "your-email@example.com" "your-password" "Your Name"
```

**Important**: Change the password after first login!

## User Roles

### Admin
- Full system access
- Can invite and manage users
- Can view all deals and data
- Can access admin panel at `/dashboard/admin/users`

### Partner
- Can view and manage deals
- Can generate memos and analyses
- Cannot invite users or access admin features

### Analyst
- Can view deals and add comments
- Limited deal management capabilities
- Cannot invite users or access admin features

## Inviting Users

### As an Admin

1. Navigate to User Management (click your profile → User Management)
2. Click "Invite User"
3. Enter email and select role
4. Send invitation

### Invitation Flow

1. Admin creates invitation with email and role
2. System generates unique invitation token (valid for 7 days)
3. Invitation link: `https://yourapp.com/auth/signup?invitation=TOKEN`
4. User clicks link and creates account
5. Account is automatically created with specified role

### Email Configuration (Optional)

To send invitation emails automatically, configure Resend:

1. Create account at [resend.com](https://resend.com)
2. Add environment variables:
   ```
   RESEND_API_KEY=your-api-key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```
3. Emails will be sent automatically when invitations are created

Without email configuration, admins can copy and share invitation links manually.

## Managing Users

### Viewing Users
- Navigate to `/dashboard/admin/users` (admin only)
- View all users in your organization
- See user roles, status, and join dates

### Deactivating Users
- Click "Deactivate" on any user (except admins)
- User is immediately signed out
- User cannot log in until reactivated
- User data is preserved

### Reactivating Users
- Click "Activate" on deactivated users
- User can immediately log in again

## Security Features

### Middleware Protection
- All routes check user authentication
- Deactivated users are automatically signed out
- Admin routes require admin role
- Active status checked on every request

### Database Security
- Row Level Security (RLS) on all tables
- Organization-based data isolation
- Invitation tokens are single-use
- Expired invitations cannot be used

### Best Practices
1. Regularly review user list
2. Deactivate users who leave the organization
3. Use strong passwords
4. Limit admin accounts
5. Monitor invitation usage

## API Endpoints

### Admin Only

```
POST   /api/admin/invitations     - Create invitation
GET    /api/admin/invitations     - List invitations
PATCH  /api/admin/users/:id       - Update user status/role
```

## Troubleshooting

### "Invalid invitation token"
- Token may be expired (7 days)
- Token may already be used
- Check invitation status in admin panel

### User can't log in
- Check if account is active
- Verify user exists in user_profiles table
- Check Supabase Auth logs

### Admin can't be deactivated
- This is by design to prevent lockout
- Transfer admin role before deactivating

## Environment Variables

Required for invitation system:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # For admin script only
```

Optional for email sending:
```
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourapp.com
```