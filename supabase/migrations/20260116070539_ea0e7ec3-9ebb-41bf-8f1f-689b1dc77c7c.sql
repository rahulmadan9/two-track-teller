-- Create function to atomically create group and add creator as member
CREATE OR REPLACE FUNCTION public.create_group_with_member(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _profile_id uuid;
    _group_id uuid;
BEGIN
    _profile_id := get_current_profile_id();
    
    IF _profile_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    -- Create group
    INSERT INTO public.groups (name, created_by)
    VALUES (_name, _profile_id)
    RETURNING id INTO _group_id;
    
    -- Add creator as member
    INSERT INTO public.group_members (group_id, profile_id)
    VALUES (_group_id, _profile_id);
    
    RETURN _group_id;
END;
$$;