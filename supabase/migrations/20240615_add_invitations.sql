-- Create invitations table for controlled user access
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'analyst',
  token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.user_profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations for their organization
CREATE POLICY "Admins can view organization invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = invitations.organization_id
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = invitations.organization_id
      AND user_profiles.role = 'admin'
    )
    AND invited_by = auth.uid()
  );

-- Anyone can check if a token is valid (for signup)
CREATE POLICY "Public can verify invitation tokens"
  ON public.invitations FOR SELECT
  TO anon, authenticated
  USING (
    -- Only allow checking unused, non-expired invitations
    used_at IS NULL 
    AND expires_at > NOW()
  );

-- Create function to claim an invitation
CREATE OR REPLACE FUNCTION public.claim_invitation(
  invitation_token UUID,
  user_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET 
    used_at = NOW(),
    used_by = user_id
  WHERE 
    token = invitation_token
    AND used_at IS NULL
    AND expires_at > NOW();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user signup with invitation
CREATE OR REPLACE FUNCTION public.handle_new_user_with_invitation()
RETURNS trigger AS $$
DECLARE
  invitation_record RECORD;
  org_id UUID;
BEGIN
  -- Check if this is an admin creation (special flag)
  IF NEW.raw_user_meta_data->>'skip_invitation_check' = 'true' THEN
    -- This is for initial admin setup only
    -- Get the first organization or create one
    SELECT id INTO org_id FROM public.organizations LIMIT 1;
    
    IF org_id IS NULL THEN
      INSERT INTO public.organizations (name) VALUES ('HTV Ventures') RETURNING id INTO org_id;
    END IF;
    
    -- Create admin profile
    INSERT INTO public.user_profiles (
      id,
      email,
      full_name,
      organization_id,
      role,
      is_active
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      org_id,
      'admin',
      true
    );
    
    RETURN NEW;
  END IF;
  
  -- Check if user has an invitation token in metadata
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE token = (NEW.raw_user_meta_data->>'invitation_token')::UUID
      AND used_at IS NULL
      AND expires_at > NOW();
    
    IF invitation_record IS NULL THEN
      RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
    
    -- Create user profile with invitation details
    INSERT INTO public.user_profiles (
      id,
      email,
      full_name,
      organization_id,
      role,
      is_active
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      invitation_record.organization_id,
      invitation_record.role,
      true
    );
    
    -- Mark invitation as used
    PERFORM public.claim_invitation(invitation_record.token, NEW.id);
  ELSE
    -- No invitation token - this should be prevented by auth settings
    -- but we'll handle it gracefully
    RAISE EXCEPTION 'Signup requires a valid invitation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger with invitation-aware version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_invitation();

-- Create index for faster token lookups
CREATE INDEX idx_invitations_token ON public.invitations(token) WHERE used_at IS NULL;
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);

-- Add is_active flag to user_profiles for deactivation
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update RLS to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_profiles WHERE id = user_id),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Add policy to prevent inactive users from accessing data
-- This should be added to all sensitive tables
-- Example for deals table:
DROP POLICY IF EXISTS "Users can view their organization's deals" ON public.deals;
CREATE POLICY "Active users can view their organization's deals"
  ON public.deals FOR ALL
  TO authenticated
  USING (
    public.is_user_active(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );