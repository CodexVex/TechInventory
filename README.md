# TechInventory

Inventario de equipos tecnológicos con React/Vite, Node/Express y **Apache CouchDB real**. Proyecto académico para dos integrantes. No utiliza Redis, MongoDB, Neo4j ni Prometheus.

## Ejecutar en la computadora

Requisitos: Docker Desktop iniciado, Docker Compose v2 y Node.js 24 o superior.

```sh
npm ci
npm run setup
docker compose up -d --build --wait
```

Abrir http://localhost:3000. El usuario inicial es `admin`; leer `ADMIN_PASSWORD` en el archivo local `.env`. La cuenta `consulta` usa `VIEWER_PASSWORD` y solo puede consultar. No publicar `.env`, contraseñas ni cookies. El generador no sobrescribe un archivo existente.

```sh
npm test
npm run build
npm run test:integration
docker compose ps
```

Las pruebas rápidas usan un doble de la base para aislar seguridad y rutas. La prueba de integración usa la API en ejecución y **CouchDB del Compose**, crea un documento con código aleatorio, lo actualiza, comprueba conflicto y consulta, y lo elimina. No presentar las pruebas rápidas como evidencia de CouchDB real.

## Funciones

Inicio/cierre de sesión; roles administrador y consulta; alta, listado, edición y eliminación confirmada; búsqueda por código, nombre, ubicación o responsable; filtro de estado; resumen estadístico. Categorías: Laptop, Desktop, Monitor, Red y Otro. Estados: Disponible, Asignado, Mantenimiento y Baja. Código único e inmutable.

Cada documento contiene `_id`, `_rev`, `type`, código, nombre, categoría, ubicación, responsable, estado, notas y fechas. El identificador `asset:CODIGO` impide duplicados concurrentes. Las escrituras utilizan `_rev`: una revisión antigua recibe HTTP 409 en lugar de sobrescribir un cambio.

## Arquitectura y seguridad

```text
Navegador → HTTPS/Caddy → Express (API + React compilado) → CouchDB → volumen couchdata
```

CouchDB no publica puertos a Internet. Express mantiene sus credenciales en el servidor. Las contraseñas de aplicación usan scrypt con sal aleatoria; cookie HttpOnly, SameSite Strict y Secure en producción, sesión firmada de una hora, protección CSRF y verificación de origen en escrituras, validación estricta, límites de solicitudes y cabeceras Helmet. El rol se comprueba en la API.

Alcance académico: un solo nodo, sin alta disponibilidad; el listado recorre los documentos del inventario y filtra en memoria, por lo que no es apropiado para grandes volúmenes. No hay recuperación de contraseña ni revocación central de sesiones ya emitidas. Cerrar sesión elimina la cookie del navegador; una copia robada vence en una hora. Cambiar SESSION_SECRET invalida todas las sesiones.

Los usuarios iniciales se crean solo si no existen; cambiar ADMIN_PASSWORD en `.env` no modifica la contraseña ya almacenada. Para rotarla, implementar una operación administrativa antes de usar datos reales. No incluir información personal sensible en la demostración.

## Persistencia y copias de seguridad

`docker compose down` conserva `couchdata`. Nunca usar `down -v` si se necesitan los datos. Para verificar persistencia, crear un equipo, reiniciar `docker compose restart`, volver a ingresar y buscar el mismo código. El registro debe conservar su `_id` y revisión.

Para una copia coherente en una VM, detener la aplicación y CouchDB, respaldar el volumen y reiniciar. Probar la restauración en un proyecto Compose separado antes de depender de ella. La replicación de CouchDB puede complementar las copias, pero no sustituye el historial de respaldos.

## Automatización

[Repositorio público](https://github.com/CodexVex/TechInventory) · [GitHub Actions](https://github.com/CodexVex/TechInventory/actions)

CI instala con `npm ci`, ejecuta pruebas, compila, audita dependencias y levanta Compose con CouchDB para integración. CD se ejecuta tras un CI exitoso en main y despliega exactamente el commit validado. Inicialmente se deshabilita con `DEPLOY_ENABLED` ausente; habilitar solo después de configurar el destino.

Configurar entorno GitHub `production`, variable `DEPLOY_ENABLED=true` y secretos `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`. El servidor debe tener Docker, Compose y su `.env` privado en `~/techinventory`. La clave SSH debe ser exclusiva de este proyecto. No se desactiva la comprobación del host SSH.

En el servidor, definir `DOMAIN` con el nombre DNS real y ejecutar:

```sh
docker compose -f compose.yaml -f compose.production.yaml up -d --build --wait
```

Caddy obtiene TLS para el dominio; DNS debe apuntar al servidor y los puertos 80/443 estar abiertos. El puerto 3000 queda limitado a loopback del host. No exponer 5984. Los cambios de contenedor conservan el volumen. CD no restaura automáticamente la versión anterior si falla el nuevo despliegue: revisar salud y volver al commit anterior.

## Entrega académica

Ver `docs/` para especificación, artículos originales en español, fuentes, comparación de hosting y guion de video. `evidence/` recoge resultados observados. Los enlaces pendientes se marcan como pendientes: un archivo o workflow preparado no demuestra una publicación ni un despliegue exitoso.
