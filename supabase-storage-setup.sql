-- Ejecutar UNA SOLA VEZ en Supabase: Dashboard -> SQL Editor -> New query -> pegar todo -> Run
-- Antes de subir el nuevo app.js, o las fotos fallarán al subir (bucket/permisos inexistentes).

-- 1. Crear el bucket público donde vivirán las fotos de las vitrinas
insert into storage.buckets (id, name, public)
values ('vitrina-media', 'vitrina-media', true)
on conflict (id) do nothing;

-- 2. Cualquiera puede LEER las fotos (las vitrinas son públicas)
create policy "Lectura publica de fotos de vitrinas"
on storage.objects for select
using (bucket_id = 'vitrina-media');

-- 3. Un usuario logueado solo puede subir archivos dentro de su propia carpeta (su user_id)
create policy "Usuarios suben solo a su carpeta"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vitrina-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Un usuario logueado solo puede reemplazar archivos dentro de su propia carpeta
create policy "Usuarios actualizan solo su carpeta"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vitrina-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Un usuario logueado solo puede borrar archivos dentro de su propia carpeta
create policy "Usuarios borran solo su carpeta"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vitrina-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
