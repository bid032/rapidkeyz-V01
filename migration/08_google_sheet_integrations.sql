-- Google Sheets integrations registry
-- Run this on the NEW Supabase project (efecpgxwbinhpfijqrzo) SQL editor.

CREATE TABLE IF NOT EXISTS public.google_sheet_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  spreadsheet_id text NOT NULL,
  worksheet_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_sheet_integrations TO authenticated;
GRANT ALL ON public.google_sheet_integrations TO service_role;

ALTER TABLE public.google_sheet_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage sheet integrations" ON public.google_sheet_integrations;
CREATE POLICY "Admins manage sheet integrations"
  ON public.google_sheet_integrations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed the existing integrations
INSERT INTO public.google_sheet_integrations (name, slug, description, spreadsheet_id, worksheet_name, enabled)
VALUES
  ('المخزون', 'stock', 'شيت مخزون الحسابات', '1D2uTiviJVADXRc3ax6BGMwlnORbnDnJZJa-v1iGyDWY', 'Stock', true),
  ('الموظفين', 'staff', 'شيت بيانات دخول الموظفين', '1D2uTiviJVADXRc3ax6BGMwlnORbnDnJZJa-v1iGyDWY', 'Staff', true)
ON CONFLICT (slug) DO UPDATE
  SET spreadsheet_id = EXCLUDED.spreadsheet_id,
      worksheet_name = EXCLUDED.worksheet_name,
      enabled = true;
