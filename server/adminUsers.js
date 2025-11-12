export function registerAdminUserRoutes(app, { supabaseAdmin, requireSupabaseRole, buildEmailFromUsername }) {
  const supabaseClient = supabaseAdmin;

  if (!supabaseClient) {
    console.warn('[adminUsers] Supabase admin client missing. Admin user routes will return 503.');
  }

  const registerRoutes = (basePath) => {
    app.post(`${basePath}/users`, async (req, res) => {
    const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
    if (!actorContext) {
      // requireSupabaseRole already sent the response (with detail)
      return;
    }

    const {
      username,
      displayName,
      role,
      departmentCode,
      temporaryPassword,
      canCreateTasks = true,
      specialty,
    } = req.body || {};

    const allowedRoles = ['admin', 'manager', 'member'];

    if (!username || !role) {
      res.status(400).json({ ok: false, error: 'missing_fields' });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(400).json({ ok: false, error: 'invalid_role' });
      return;
    }

    if (!supabaseClient) {
      res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
      return;
    }

    const password = temporaryPassword || '1234';

    if (actorContext.profile.role === 'manager') {
      if (role !== 'member') {
        res.status(403).json({ ok: false, error: 'managers_can_create_members_only' });
        return;
      }
      if (!actorContext.profile.department_code) {
        res.status(400).json({ ok: false, error: 'manager_missing_department' });
        return;
      }
      if (departmentCode && departmentCode !== actorContext.profile.department_code) {
        res.status(403).json({ ok: false, error: 'cannot_assign_other_department' });
        return;
      }
    }

    const email = buildEmailFromUsername(username);
    if (!email) {
      res.status(400).json({ ok: false, error: 'invalid_username' });
      return;
    }

    try {
      const { data: takenProfile, error: profileLookupError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (profileLookupError) {
        console.error('[adminUsers] Failed to check username availability', profileLookupError);
        res.status(500).json({ ok: false, error: 'username_lookup_failed' });
        return;
      }

      if (takenProfile) {
        res.status(409).json({ ok: false, error: 'username_taken' });
        return;
      }

      const { data: created, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName,
        },
      });

      if (createError || !created?.user) {
        console.error('[adminUsers] Supabase auth createUser failed', createError);
        res.status(400).json({ ok: false, error: createError?.message || 'auth_create_failed' });
        return;
      }

      const newUser = created.user;

      const profilePayload = {
        id: newUser.id,
        username,
        display_name: displayName || username,
        role,
        department_code: actorContext.profile.role === 'manager'
          ? actorContext.profile.department_code
          : (departmentCode || null),
        status: 'active',
        can_create_tasks: canCreateTasks,
        require_password_change: true,
        specialty: specialty || null,
      };

      if (actorContext.profile.role === 'manager' && !profilePayload.department_code) {
        console.error('[adminUsers] Manager could not determine department for new member');
        await supabaseClient.auth.admin.deleteUser(newUser.id).catch(() => {});
        res.status(400).json({ ok: false, error: 'manager_missing_department' });
        return;
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        console.error('[adminUsers] Failed to upsert profile after auth create', profileError);
        await supabaseClient.auth.admin.deleteUser(newUser.id).catch(err => {
          console.warn('[adminUsers] Cleanup deleteUser failed', err?.message || err);
        });
        res.status(500).json({ ok: false, error: 'profile_upsert_failed' });
        return;
      }

      res.status(201).json({
        ok: true,
        user: {
          id: newUser.id,
          username,
          displayName: profilePayload.display_name,
          role,
          departmentCode: profilePayload.department_code,
          status: profilePayload.status,
          canCreateTasks: !!profilePayload.can_create_tasks,
          requirePasswordChange: true,
          specialty: profilePayload.specialty,
        },
      });
    } catch (err) {
      console.error('[adminUsers] Unexpected error creating user', err);
      res.status(500).json({ ok: false, error: 'admin_user_create_failed' });
    }
    });

    app.delete(`${basePath}/users/:id`, async (req, res) => {
    const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
    if (!actorContext) return;

    const userId = req.params.id;
    if (!userId) {
      res.status(400).json({ ok: false, error: 'missing_user_id' });
      return;
    }

    if (!supabaseClient) {
      res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
      return;
    }

    try {
      const { data: targetProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, role, department_code')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[adminUsers] Failed to load profile for deletion', profileError);
        res.status(500).json({ ok: false, error: 'profile_lookup_failed' });
        return;
      }

      if (!targetProfile) {
        res.status(404).json({ ok: false, error: 'user_not_found' });
        return;
      }

      if (actorContext.profile.role === 'manager') {
        if (targetProfile.role !== 'member') {
          res.status(403).json({ ok: false, error: 'managers_can_delete_members_only' });
          return;
        }
        if (targetProfile.department_code !== actorContext.profile.department_code) {
          res.status(403).json({ ok: false, error: 'cannot_delete_other_department' });
          return;
        }
      }

      const { error: deleteProfileError } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteProfileError) {
        console.error('[adminUsers] Failed to delete profile', deleteProfileError);
        res.status(500).json({ ok: false, error: 'profile_delete_failed' });
        return;
      }

      const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.warn('[adminUsers] Deleted profile but failed to remove auth user', deleteAuthError);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[adminUsers] Unexpected error deleting user', err);
      res.status(500).json({ ok: false, error: 'admin_user_delete_failed' });
    }
    });

    app.patch(`${basePath}/users/:id`, async (req, res) => {
    const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
    if (!actorContext) return;

    const userId = req.params.id;
    if (!userId) {
      res.status(400).json({ ok: false, error: 'missing_user_id' });
      return;
    }

    if (!supabaseClient) {
      res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
      return;
    }

    const {
      displayName,
      specialty,
      canCreateTasks,
      role,
      status,
      departmentCode,
    } = req.body || {};

    const updates = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (specialty !== undefined) updates.specialty = specialty;
    if (canCreateTasks !== undefined) updates.can_create_tasks = canCreateTasks;
    if (status !== undefined) updates.status = status;
    if (role !== undefined) updates.role = role;
    if (departmentCode !== undefined) updates.department_code = departmentCode;

    if (!Object.keys(updates).length) {
      res.status(400).json({ ok: false, error: 'no_updates_provided' });
      return;
    }

    try {
      const { data: targetProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, role, department_code')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[adminUsers] Failed to load profile for update', profileError);
        res.status(500).json({ ok: false, error: 'profile_lookup_failed' });
        return;
      }

      if (!targetProfile) {
        res.status(404).json({ ok: false, error: 'user_not_found' });
        return;
      }

      if (actorContext.profile.role === 'manager') {
        if (targetProfile.role !== 'member') {
          res.status(403).json({ ok: false, error: 'managers_can_update_members_only' });
          return;
        }
        if (targetProfile.department_code !== actorContext.profile.department_code) {
          res.status(403).json({ ok: false, error: 'cannot_update_other_department' });
          return;
        }

        if (role !== undefined || departmentCode !== undefined || status === 'disabled') {
          res.status(403).json({ ok: false, error: 'manager_update_not_allowed' });
          return;
        }
      }

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) {
        console.error('[adminUsers] Failed to update profile', updateError);
        res.status(500).json({ ok: false, error: 'profile_update_failed' });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[adminUsers] Unexpected error updating user', err);
      res.status(500).json({ ok: false, error: 'admin_user_update_failed' });
    }
    });
  };

  ['/api/admin', '/api/partners/api/admin'].forEach(registerRoutes);
}
