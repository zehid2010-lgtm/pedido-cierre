CREATE TABLE public.compras_semanales (
  id bigint PRIMARY KEY,
  fecha_venta date NOT NULL,
  cliente text NOT NULL,
  razon_social text,
  ruta text,
  mpr text NOT NULL,
  descripcion_mpr text,
  cantidad_unidades numeric NOT NULL DEFAULT 0,
  identificador_origen text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  venta_uc numeric NOT NULL DEFAULT 0,
  venta_co numeric NOT NULL DEFAULT 0
);

CREATE INDEX compras_semanales_cliente_mpr_idx
  ON public.compras_semanales(cliente, mpr);
CREATE INDEX compras_semanales_fecha_idx
  ON public.compras_semanales(fecha_venta);

ALTER TABLE public.compras_semanales ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.compras_semanales TO authenticated;
GRANT ALL ON public.compras_semanales TO service_role;

CREATE POLICY "usuarios autenticados leen compras semanales"
ON public.compras_semanales
FOR SELECT TO authenticated
USING (true);

CREATE TABLE public.ingest_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  secret_hash bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ingest_config TO service_role;
