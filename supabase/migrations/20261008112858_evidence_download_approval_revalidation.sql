-- Private Storage CDN responses can outlive an approval change, even when the
-- object response says no-store. Never grant customer tokens a byte-download
-- or signing capability. The application download route revalidates the
-- existing approval + object-owner helper before reading bytes as the backend.
-- Existing tenant/approval policies remain mandatory for every allowed action.
create policy "customer evidence bytes require approval gateway"
on storage.objects as restrictive for select to authenticated
using (
  coalesce(current_setting('storage.operation', true), '') = any(array[
    'storage.object.list', 'object.list',
    'storage.object.list_v2', 'object.list_v2',
    'storage.object.upload', 'object.upload',
    'storage.object.upload_update', 'object.upload_update',
    'storage.object.delete', 'object.delete',
    'storage.object.delete_many', 'object.delete_many'
  ])
);
