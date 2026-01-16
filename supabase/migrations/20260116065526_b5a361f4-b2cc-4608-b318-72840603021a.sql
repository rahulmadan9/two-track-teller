-- Create helper function for invite code generation
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN upper(substr(md5(random()::text), 1, 8));
END;
$$;

-- Create groups table
CREATE TABLE public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create group_members table
CREATE TABLE public.group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(group_id, profile_id)
);

-- Add group_id column to expenses table
ALTER TABLE public.expenses
ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = _group_id
        AND profile_id = get_current_profile_id()
    )
$$;

-- RLS Policies for groups table
CREATE POLICY "Users can view groups they are members of"
ON public.groups FOR SELECT
USING (is_group_member(id));

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
WITH CHECK (created_by = get_current_profile_id());

CREATE POLICY "Group creators can update their groups"
ON public.groups FOR UPDATE
USING (created_by = get_current_profile_id());

-- RLS Policies for group_members table
CREATE POLICY "Users can view members of their groups"
ON public.group_members FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT
WITH CHECK (profile_id = get_current_profile_id());

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE
USING (profile_id = get_current_profile_id());

-- Update expenses RLS policies to include group_id check
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view group expenses"
ON public.expenses FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Users can insert group expenses"
ON public.expenses FOR INSERT
WITH CHECK (is_group_member(group_id) AND paid_by = get_current_profile_id());

CREATE POLICY "Users can update group expenses"
ON public.expenses FOR UPDATE
USING (is_group_member(group_id) AND (paid_by = get_current_profile_id() OR owes_user_id = get_current_profile_id()));

CREATE POLICY "Users can delete group expenses"
ON public.expenses FOR DELETE
USING (is_group_member(group_id) AND paid_by = get_current_profile_id());

-- Enable realtime for groups and group_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;