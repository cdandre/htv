-- Update the user creation trigger to allow admin creation
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