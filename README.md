# Pedido Cierre

Crear una app web mobile-first llamada "Pedido Sugerido - Desarrollo Tucumán".

REGLA PRINCIPAL DE DATOS:
La app debe trabajar con DOS archivos Excel de origen separados. Ambos tienen una hoja llamada "Export". Esos dos archivos son fuentes originales y deben conservarse conceptualmente intactos: no modificar, reordenar ni reemplazar sus columnas de origen. Toda transformación debe hacerse en una capa posterior de procesamiento dentro de la app.

FUENTE 1 - archivo consolidado por cliente:
Usar la estructura original tal como llega. Contiene el resultado oficial del indicador por cliente/ruta y debe considerarse la fuente oficial para el cumplimiento consolidado.

FUENTE 2 - archivo detallado por cliente + MPR:
Usar la estructura original tal como llega. Contiene, entre otros, Cliente, MPR, Pedido, Sugerencia y Cumplimiento. Esta fuente permite calcular qué compró cada cliente, qué tenía sugerido y qué le falta por MPR.

OBJETIVO DE NEGOCIO:
El vendedor Base visita al mismo cliente 2 veces por semana y el vendedor de Desarrollo 1 vez. Pedido Sugerido mide al equipo completo. Desarrollo necesita ver, en su tercera visita, lo que aún queda pendiente del sugerido luego de las compras previas del cliente, para cerrar la semana y luego enfocarse en multicategoría.

REGLA DE CÁLCULO:
- Faltante por MPR = MAX(Sugerencia - Pedido, 0)
- La sobrecompra de un MPR NO debe compensar el faltante de otro MPR.
- Mantener valores originales en unidades físicas.
- Incorporar conversión opcional a packs mediante una tabla de equivalencias MPR -> unidades por pack.
- Mostrar unidades y packs por separado.
- Si no existe equivalencia confirmada para un MPR, mostrar unidades y marcar "equivalencia pendiente"; no inventar el pack.

PRIMERA VERSIÓN:
1) Login.
2) Dashboard general:
   - cumplimiento general oficial
   - cantidad de clientes críticos, por cerrar y cumplidos
   - filtros por Ruta, Cliente y Estado
3) Vista "Clientes":
   - número de cliente
   - razón social
   - ruta
   - cumplimiento oficial
   - sugerido
   - comprado
   - faltante
   - faltante en packs cuando haya equivalencia
   - semáforo: rojo <70%, amarillo 70-99%, verde >=100%
4) Detalle de cliente:
   - datos del cliente
   - sugerido total
   - comprado total
   - faltante total
   - tabla por MPR/producto con Pedido, Sugerencia, Faltante, unidades por pack y faltante packs
5) Vista "Pendientes Desarrollo":
   - mostrar solo MPR con faltante > 0
   - ordenar por cliente prioritario y mayor faltante
   - navegación simple para celular
6) Vista "Equivalencias MPR":
   - MPR
   - descripción
   - unidades por pack
   - editable solo por administrador
7) Importación:
   - pantalla para cargar DOS Excel separados
   - cada importación debe validar que exista hoja "Export"
   - conservar una copia lógica de los datos originales
   - mostrar errores de estructura claramente
   - procesar los cruces recién después de importar ambas fuentes
8) Seguridad:
   - roles Administrador y Desarrollo
   - Administrador ve todo Tucumán y puede importar archivos y mantener equivalencias
   - Desarrollo solo lectura para pedido sugerido y pendientes
   - preparar arquitectura para que más adelante cada vendedor vea solo sus rutas/clientes

DISEÑO:
- limpio, profesional, muy fácil de usar desde Android
- tarjetas grandes y filtros visibles
- colores de semáforo claros
- tablas responsivas
- idioma español
- evitar una estética genérica; debe sentirse como herramienta comercial de campo

IMPORTANTE:
No conectar todavía SAP ni Power BI. Esta primera versión se valida cargando manualmente los dos Excel originales. La arquitectura debe quedar preparada para automatizar la actualización después.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/72daab7e-e9d3-4d72-af64-5c9d36c619bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


## Vercel migration

This branch is prepared for a Vercel preview deployment while the existing Lovable deployment remains untouched.


## GitHub-only mode

La aplicación puede ejecutarse en GitHub Pages sin depender de un backend permanente. Los datos operativos se guardan en IndexedDB dentro del navegador y pueden exportarse/restaurarse como un respaldo JSON privado. La primera carga puede migrar una copia local desde Supabase mientras ese proyecto siga disponible.
