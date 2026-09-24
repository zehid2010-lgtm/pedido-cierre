CREATE OR REPLACE VIEW public.vw_pedido_sugerido_clientes AS
SELECT
  cliente,
  razon_social,
  ruta,
  sum(sugerencia) AS sugerido,
  sum(LEAST(comprado, sugerencia)) AS comprado,
  sum(faltante) AS faltante,
  round(
    CASE
      WHEN sum(sugerencia) > 0
        THEN sum(LEAST(comprado, sugerencia)) / sum(sugerencia) * 100.0
      ELSE 100
    END,
    1
  ) AS cumplimiento_pct,
  CASE
    WHEN bool_or(estado_cruce_cliente = 'AMBIGUO') THEN 'AMBIGUO'
    WHEN sum(faltante) = 0 THEN 'CUMPLIDO'
    WHEN sum(LEAST(comprado, sugerencia)) / NULLIF(sum(sugerencia), 0) >= 0.70
      THEN 'POR_CERRAR'
    ELSE 'CRITICO'
  END AS estado,
  bool_or(estado_cruce_cliente = 'AMBIGUO') AS tiene_ambiguedad,
  max(fecha_ventas) AS fecha_ventas
FROM public.vw_pedido_sugerido_actual
GROUP BY cliente, razon_social, ruta;

ALTER VIEW public.vw_pedido_sugerido_clientes SET (security_invoker = true);
GRANT SELECT ON public.vw_pedido_sugerido_clientes TO authenticated;
