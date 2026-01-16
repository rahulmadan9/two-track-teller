-- Create a security definer function to find a group by invite code
-- This allows users to look up groups they want to join (before they're members)
CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(_invite_code text)
RETURNS TABLE (
    id uuid,
    name text,
    invite_code text,
    created_by uuid,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.name, g.invite_code, g.created_by, g.created_at
    FROM public.groups g
    WHERE g.invite_code = upper(_invite_code);
END;
$$;