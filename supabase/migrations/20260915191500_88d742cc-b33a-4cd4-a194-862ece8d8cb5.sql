CREATE OR REPLACE VIEW public.vw_pedido_sugerido_actual AS
WITH ultima_importacion AS (
  SELECT importaciones.id FROM importaciones WHERE importaciones.estado = 'procesada' ORDER BY importaciones.created_at DESC LIMIT 1
), fecha_actual AS (
  SELECT max(compras_semanales.fecha_venta) AS fecha FROM compras_semanales
), pedido_clientes AS (
  SELECT DISTINCT d.cliente,
    d.razon_social,
    regexp_replace(upper(btrim(d.razon_social)), '[^A-Z0-9]', '', 'g') AS nombre_norm,
    NULLIF(regexp_replace(upper(btrim(coalesce(d.ruta,''))), '[^A-Z0-9]', '', 'g'), '') AS ruta_norm
  FROM detalle_mpr d
  WHERE d.importacion_id = (SELECT id FROM ultima_importacion)
), ventas_clientes AS (
  SELECT DISTINCT c.cliente,
    c.razon_social,
    regexp_replace(upper(btrim(c.razon_social)), '[^A-Z0-9]', '', 'g') AS nombre_norm,
    NULLIF(regexp_replace(upper(btrim(coalesce(c.ruta,''))), '[^A-Z0-9]', '', 'g'), '') AS ruta_norm
  FROM compras_semanales c CROSS JOIN fecha_actual f
  WHERE c.fecha_venta = f.fecha
), candidatos AS (
  SELECT p.cliente AS cliente_pedido,
    (SELECT count(DISTINCT vn.cliente) FROM ventas_clientes vn
       WHERE vn.nombre_norm = p.nombre_norm
         AND p.ruta_norm IS NOT NULL AND vn.ruta_norm IS NOT NULL
         AND vn.ruta_norm = p.ruta_norm) AS n_candidatos,
    (SELECT min(vn.cliente) FROM ventas_clientes vn
       WHERE vn.nombre_norm = p.nombre_norm
         AND p.ruta_norm IS NOT NULL AND vn.ruta_norm IS NOT NULL
         AND vn.ruta_norm = p.ruta_norm) AS cliente_candidato,
    EXISTS (SELECT 1 FROM ventas_clientes vx WHERE vx.cliente = p.cliente) AS hay_exacto
  FROM pedido_clientes p
), resolucion_cliente AS (
  SELECT c.cliente_pedido,
    CASE WHEN c.hay_exacto THEN c.cliente_pedido
         WHEN c.n_candidatos = 1 THEN c.cliente_candidato
         ELSE NULL END AS cliente_venta,
    CASE WHEN c.hay_exacto THEN 'ID_EXACTO'
         WHEN c.n_candidatos = 1 THEN 'NOMBRE_UNICO'
         WHEN c.n_candidatos = 0 THEN 'SIN_COMPRA'
         ELSE 'AMBIGUO' END AS estado_cruce_cliente
  FROM candidatos c
), pedido AS (
  SELECT d.cliente, d.razon_social, d.ruta, d.mpr, d.sugerencia, r.cliente_venta, r.estado_cruce_cliente,
    CASE WHEN upper(d.mpr) LIKE '%BENEDICTINO%' THEN 'BENEDICTINO'
         ELSE split_part(regexp_replace(upper(btrim(d.mpr)), '[^A-Z0-9]+', ' ', 'g'), ' ', 1) END AS marca,
    CASE WHEN upper(d.mpr) LIKE '%ZERO%' THEN 'ZERO' ELSE 'REGULAR' END AS variante,
    CASE WHEN upper(d.mpr) LIKE '%NO RETORNABLE%' THEN 'NR'
         WHEN upper(d.mpr) LIKE '%RETORNABLE%' THEN 'RET' ELSE 'SIN_DATO' END AS retorno,
    (upper(d.mpr) LIKE '%FRESH%') AS es_fresh,
    (upper(d.mpr) LIKE 'SODA BENEDICTINO%') AS es_soda_benedictino,
    CASE WHEN upper(d.mpr) ~ '([0-9]+([.,][0-9]+)?)\s*ML' THEN (replace(substring(upper(d.mpr), '([0-9]+([.,][0-9]+)?)\s*ML'), ',', '.'))::numeric
         WHEN upper(d.mpr) ~ '([0-9]+([.,][0-9]+)?)\s*(L|LTRO|LTROS|LTS|LITRO|LITROS)' THEN (replace(substring(upper(d.mpr), '([0-9]+([.,][0-9]+)?)\s*(L|LTRO|LTROS|LTS|LITRO|LITROS)'), ',', '.'))::numeric * 1000
         ELSE NULL END AS volumen_ml
  FROM detalle_mpr d LEFT JOIN resolucion_cliente r ON r.cliente_pedido = d.cliente
  WHERE d.importacion_id = (SELECT id FROM ultima_importacion)
), ventas AS (
  SELECT c.cliente, c.mpr, c.venta_co,
    CASE WHEN upper(c.mpr) LIKE '%BENEDICTINO%' THEN 'BENEDICTINO'
         ELSE split_part(regexp_replace(upper(btrim(c.mpr)), '[^A-Z0-9]+', ' ', 'g'), ' ', 1) END AS marca,
    CASE WHEN upper(c.mpr) LIKE '%ZERO%' THEN 'ZERO' ELSE 'REGULAR' END AS variante,
    CASE WHEN upper(c.mpr) LIKE '%NO RETORNABLE%' THEN 'NR'
         WHEN upper(c.mpr) ~ '(^|[^A-Z0-9])NR([^A-Z0-9]|$)' THEN 'NR'
         WHEN upper(c.mpr) LIKE '%RETORNABLE%' THEN 'RET'
         WHEN upper(c.mpr) ~ '(^|[^A-Z0-9])(VR|RET)([^A-Z0-9]|$)' THEN 'RET'
         ELSE 'SIN_DATO' END AS retorno,
    (upper(c.mpr) LIKE '%FRESH%') AS es_fresh,
    (upper(c.mpr) LIKE '%C/GAS%') AS con_gas,
    CASE WHEN upper(c.mpr) ~ '([0-9]+([.,][0-9]+)?)\s*ML' THEN (replace(substring(upper(c.mpr), '([0-9]+([.,][0-9]+)?)\s*ML'), ',', '.'))::numeric
         WHEN upper(c.mpr) ~ '([0-9]+([.,][0-9]+)?)\s*(L|LTRO|LTROS|LTS|LITRO|LITROS)' THEN (replace(substring(upper(c.mpr), '([0-9]+([.,][0-9]+)?)\s*(L|LTRO|LTROS|LTS|LITRO|LITROS)'), ',', '.'))::numeric * 1000
         ELSE NULL END AS volumen_ml,
    COALESCE((NULLIF(substring(upper(c.mpr), '([0-9]+)\s*B([^A-Z]|$)'), ''))::numeric,
             (NULLIF(substring(upper(c.mpr), '([0-9]+)\s*LATAS?([^A-Z]|$)'), ''))::numeric,
             (NULLIF(substring(upper(c.mpr), '([0-9]+)\s*BOTELLAS?([^A-Z]|$)'), ''))::numeric,
             (NULLIF(substring(upper(c.mpr), '([0-9]+)\s*UNIDADES?([^A-Z]|$)'), ''))::numeric) AS unidades_por_caja
  FROM compras_semanales c CROSS JOIN fecha_actual f
  WHERE c.fecha_venta = f.fecha
), resultado AS (
  SELECT p.cliente, p.razon_social, p.ruta, p.mpr, p.sugerencia, p.estado_cruce_cliente,
    GREATEST(COALESCE(sum(CASE WHEN v.unidades_por_caja IS NOT NULL THEN v.venta_co * v.unidades_por_caja ELSE 0 END), 0), 0) AS comprado,
    f.fecha AS fecha_ventas
  FROM pedido p CROSS JOIN fecha_actual f
  LEFT JOIN ventas v ON p.cliente_venta IS NOT NULL AND v.cliente = p.cliente_venta AND v.marca = p.marca
    AND v.volumen_ml = p.volumen_ml AND v.variante = p.variante AND v.retorno = p.retorno AND v.es_fresh = p.es_fresh
    AND (p.es_soda_benedictino = false OR v.con_gas = true)
  GROUP BY p.cliente, p.razon_social, p.ruta, p.mpr, p.sugerencia, p.estado_cruce_cliente, f.fecha
)
SELECT cliente, razon_social, ruta, mpr, sugerencia, comprado,
  GREATEST(sugerencia - comprado, 0) AS faltante,
  CASE WHEN sugerencia > 0 THEN round(LEAST((comprado / sugerencia) * 100.0, 100), 1) ELSE 100 END AS cumplimiento_pct,
  estado_cruce_cliente, fecha_ventas
FROM resultado;