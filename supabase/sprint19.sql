-- Sprint 19: Allow authenticated users to update their own must_change_password flag
CREATE POLICY "Users can update own must_change_password" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
