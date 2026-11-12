# Guion de video público — 4 minutos 40 segundos

No grabado ni publicado todavía. No mostrar contraseñas, cookies, claves SSH o datos reales de personas. Usar equipos y responsables ficticios. Narración en español; ambos integrantes pueden dividir las dos primeras y las dos últimas secciones.

| Tiempo | Pantalla y captura necesaria | Narración sugerida |
|---|---|---|
| 0:00–0:25 | Título e inventario | “TechInventory permite controlar equipos tecnológicos usando Apache CouchDB como base documental.” |
| 0:25–1:10 | Registro de LT-DEMO, filtros y edición | “Registramos el equipo, lo buscamos y cambiamos su estado. La cuenta de consulta puede leer, pero no modificar.” |
| 1:10–1:55 | Documento de demostración y conflicto de revisión | “Cada equipo es un documento JSON. CouchDB exige la revisión vigente y rechaza una escritura antigua para evitar sobrescribir cambios.” |
| 1:55–2:30 | Compose y reinicio; mismo equipo visible | “CouchDB conserva los documentos en un volumen. Reiniciamos los contenedores y el equipo continúa registrado.” |
| 2:30–3:35 | Commit público → Actions CI → CD exitoso | “La automatización instala, prueba y construye. Solo después despliega el commit que fue validado.” |
| 3:35–4:10 | URL HTTPS con cambio visible | “Comprobamos que la publicación corresponde al cambio del repositorio. CouchDB no queda expuesto a Internet.” |
| 4:10–4:40 | Referencias y enlaces | “El repositorio incluye instrucciones reproducibles, pruebas y dos artículos con enfoques diferentes: documentos y concurrencia; automatización y persistencia.” |

## Lista de capturas reales

1. Inventario de escritorio y móvil.
2. Alta, edición, búsqueda y eliminación con confirmación.
3. Respuesta 409 en prueba de integración y documento con `_rev`, sin credenciales.
4. Mismo equipo antes y después del reinicio.
5. GitHub Actions con commit y estado final.
6. Navegador con HTTPS público.

Si cloud o CD están pendientes, no grabar una simulación como resultado. Resolver el paso o declarar la limitación en el video. Exportar en MP4 1080p, revisar duración <=300 segundos y publicar en una cuenta autorizada; incorporar la URL comprobada al archivo de enlaces. No se envía nada a Telegram sin instrucción explícita y destino confirmado.
