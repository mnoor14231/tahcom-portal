export function registerAdminKpiRoutes(app, { supabaseAdmin, requireSupabaseRole }) {
  const supabaseClient = supabaseAdmin;

  if (!supabaseClient) {
    console.warn('[adminKpis] Supabase admin client missing. KPI admin routes will return 503.');
  }

  const normalizeKpiPayload = (body = {}) => {
    const {
      id,
      departmentCode,
      name,
      description,
      unit,
      target,
      currentValue,
      ownerUserId,
      lastUpdated,
    } = body;

    if (!id || typeof id !== 'string') {
      return { error: 'missing_or_invalid_id' };
    }
    if (!departmentCode || typeof departmentCode !== 'string') {
      return { error: 'missing_department_code' };
    }
    if (!name || typeof name !== 'string') {
      return { error: 'missing_name' };
    }
    if (typeof unit !== 'string' || !unit.trim()) {
      return { error: 'missing_unit' };
    }
    if (typeof target !== 'number') {
      return { error: 'missing_target' };
    }
    if (typeof currentValue !== 'number') {
      return { error: 'missing_current_value' };
    }

    return {
      payload: {
        id,
        department_code: departmentCode,
        name,
        description: description ?? null,
        unit,
        target,
        current_value: currentValue,
        owner_user_id: ownerUserId ?? null,
        last_updated: lastUpdated ?? new Date().toISOString(),
      },
    };
  };

  const registerRoutes = (basePath) => {
    app.post(`${basePath}/kpis`, async (req, res) => {
      const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
      if (!actorContext) return;

      if (!supabaseClient) {
        res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
        return;
      }

      const { payload, error } = normalizeKpiPayload(req.body);
      if (error) {
        res.status(400).json({ ok: false, error });
        return;
      }

      try {
        const { error: upsertError } = await supabaseClient
          .from('kpis')
          .upsert(payload, { onConflict: 'id' });

        if (upsertError) {
          console.error('[adminKpis] Failed to upsert KPI', upsertError);
          res.status(500).json({ ok: false, error: 'kpi_upsert_failed' });
          return;
        }

        res.status(201).json({ ok: true });
      } catch (err) {
        console.error('[adminKpis] Unexpected error creating KPI', err);
        res.status(500).json({ ok: false, error: 'admin_kpi_create_failed' });
      }
    });

    app.patch(`${basePath}/kpis/:id`, async (req, res) => {
      const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
      if (!actorContext) return;

      if (!supabaseClient) {
        res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
        return;
      }

      const kpiId = req.params.id;
      if (!kpiId) {
        res.status(400).json({ ok: false, error: 'missing_id' });
        return;
      }

      const updates = {};
      const allowedKeys = ['name', 'description', 'unit', 'target', 'currentValue', 'ownerUserId', 'lastUpdated'];
      for (const key of allowedKeys) {
        if (key in req.body) updates[key] = req.body[key];
      }

      if (!Object.keys(updates).length) {
        res.status(400).json({ ok: false, error: 'no_updates_provided' });
        return;
      }

      const rowUpdates = {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description ?? null }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
        ...(updates.target !== undefined && { target: updates.target }),
        ...(updates.currentValue !== undefined && { current_value: updates.currentValue }),
        ...(updates.ownerUserId !== undefined && { owner_user_id: updates.ownerUserId ?? null }),
        ...(updates.lastUpdated !== undefined && { last_updated: updates.lastUpdated }),
      };

      try {
        const { error: updateError } = await supabaseClient
          .from('kpis')
          .update(rowUpdates)
          .eq('id', kpiId);

        if (updateError) {
          console.error('[adminKpis] Failed to update KPI', updateError);
          res.status(500).json({ ok: false, error: 'kpi_update_failed' });
          return;
        }

        res.json({ ok: true });
      } catch (err) {
        console.error('[adminKpis] Unexpected error updating KPI', err);
        res.status(500).json({ ok: false, error: 'admin_kpi_update_failed' });
      }
    });

    app.delete(`${basePath}/kpis/:id`, async (req, res) => {
      const actorContext = await requireSupabaseRole(req, res, ['admin', 'manager']);
      if (!actorContext) return;

      if (!supabaseClient) {
        res.status(503).json({ ok: false, error: 'supabase_admin_unavailable' });
        return;
      }

      const kpiId = req.params.id;
      if (!kpiId) {
        res.status(400).json({ ok: false, error: 'missing_id' });
        return;
      }

      try {
        const { error: deleteError } = await supabaseClient
          .from('kpis')
          .delete()
          .eq('id', kpiId);

        if (deleteError) {
          console.error('[adminKpis] Failed to delete KPI', deleteError);
          res.status(500).json({ ok: false, error: 'kpi_delete_failed' });
          return;
        }

        res.json({ ok: true });
      } catch (err) {
        console.error('[adminKpis] Unexpected error deleting KPI', err);
        res.status(500).json({ ok: false, error: 'admin_kpi_delete_failed' });
      }
    });
  };

  ['/api/admin', '/api/partners/api/admin'].forEach(registerRoutes);
}


