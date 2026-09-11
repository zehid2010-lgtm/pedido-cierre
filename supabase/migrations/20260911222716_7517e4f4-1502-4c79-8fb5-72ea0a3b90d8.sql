
CREATE TYPE public.app_role AS ENUM ('administrador','desarrollo');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nombre text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'administrador');
$$;

CREATE POLICY "perfil propio visible" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "crear perfil propio" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "editar perfil propio" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "ver roles propios" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  es_primero boolean;
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO es_primero;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN es_primero THEN 'administrador'::public.app_role ELSE 'desarrollo'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.importaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  archivo_consolidado text,
  archivo_detalle text,
  filas_consolidado integer NOT NULL DEFAULT 0,
  filas_detalle integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importaciones TO authenticated;
GRANT ALL ON public.importaciones TO service_role;
ALTER TABLE public.importaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "importaciones lectura" ON public.importaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "importaciones admin" ON public.importaciones FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.origen_consolidado (
  id bigserial PRIMARY KEY,
  importacion_id uuid NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  fila integer NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX idx_origen_consolidado_imp ON public.origen_consolidado(importacion_id);
GRANT SELECT, INSERT, DELETE ON public.origen_consolidado TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.origen_consolidado_id_seq TO authenticated;
GRANT ALL ON public.origen_consolidado TO service_role;
GRANT ALL ON SEQUENCE public.origen_consolidado_id_seq TO service_role;
ALTER TABLE public.origen_consolidado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "origen1 lectura" ON public.origen_consolidado FOR SELECT TO authenticated USING (true);
CREATE POLICY "origen1 admin" ON public.origen_consolidado FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.origen_detalle (
  id bigserial PRIMARY KEY,
  importacion_id uuid NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  fila integer NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX idx_origen_detalle_imp ON public.origen_detalle(importacion_id);
GRANT SELECT, INSERT, DELETE ON public.origen_detalle TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.origen_detalle_id_seq TO authenticated;
GRANT ALL ON public.origen_detalle TO service_role;
GRANT ALL ON SEQUENCE public.origen_detalle_id_seq TO service_role;
ALTER TABLE public.origen_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "origen2 lectura" ON public.origen_detalle FOR SELECT TO authenticated USING (true);
CREATE POLICY "origen2 admin" ON public.origen_detalle FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.clientes_consolidado (
  id bigserial PRIMARY KEY,
  importacion_id uuid NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  cliente text NOT NULL,
  razon_social text,
  ruta text,
  cumplimiento numeric,
  UNIQUE (importacion_id, cliente)
);
CREATE INDEX idx_cc_imp ON public.clientes_consolidado(importacion_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_consolidado TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.clientes_consolidado_id_seq TO authenticated;
GRANT ALL ON public.clientes_consolidado TO service_role;
GRANT ALL ON SEQUENCE public.clientes_consolidado_id_seq TO service_role;
ALTER TABLE public.clientes_consolidado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc lectura" ON public.clientes_consolidado FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc admin" ON public.clientes_consolidado FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.detalle_mpr (
  id bigserial PRIMARY KEY,
  importacion_id uuid NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  cliente text NOT NULL,
  razon_social text,
  ruta text,
  mpr text NOT NULL,
  descripcion text,
  pedido numeric NOT NULL DEFAULT 0,
  sugerencia numeric NOT NULL DEFAULT 0,
  cumplimiento numeric,
  faltante numeric GENERATED ALWAYS AS (GREATEST(sugerencia - pedido, 0)) STORED
);
CREATE INDEX idx_dm_imp ON public.detalle_mpr(importacion_id);
CREATE INDEX idx_dm_cliente ON public.detalle_mpr(importacion_id, cliente);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detalle_mpr TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.detalle_mpr_id_seq TO authenticated;
GRANT ALL ON public.detalle_mpr TO service_role;
GRANT ALL ON SEQUENCE public.detalle_mpr_id_seq TO service_role;
ALTER TABLE public.detalle_mpr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm lectura" ON public.detalle_mpr FOR SELECT TO authenticated USING (true);
CREATE POLICY "dm admin" ON public.detalle_mpr FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.equivalencias_mpr (
  mpr text PRIMARY KEY,
  descripcion text,
  unidades_por_pack numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equivalencias_mpr TO authenticated;
GRANT ALL ON public.equivalencias_mpr TO service_role;
ALTER TABLE public.equivalencias_mpr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equiv lectura" ON public.equivalencias_mpr FOR SELECT TO authenticated USING (true);
CREATE POLICY "equiv admin" ON public.equivalencias_mpr FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
