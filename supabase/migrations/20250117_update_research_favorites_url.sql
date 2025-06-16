-- Make URL nullable and change unique constraint from url to title
ALTER TABLE public.research_favorites
  ALTER COLUMN url DROP NOT NULL;

-- Drop the old unique constraint
ALTER TABLE public.research_favorites
  DROP CONSTRAINT IF EXISTS research_favorites_organization_id_user_id_url_key;

-- Add new unique constraint on title
ALTER TABLE public.research_favorites
  ADD CONSTRAINT research_favorites_organization_id_user_id_title_key 
  UNIQUE(organization_id, user_id, title);