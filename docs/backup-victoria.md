# TechInventory: estrategia NoSQL de backup físico cifrado y restauración verificada con CouchDB

Publicado: https://dev.to/codexvex/techinventory-estrategia-nosql-de-backup-fisico-cifrado-y-restauracion-verificada-con-couchdb-46hc

Autora: **Victoria Lavarello Vidaurre**. Proyecto desarrollado junto con **Gabriela Cohaila**.

En la primera entrega de TechInventory construimos un inventario de equipos con React, Express y Apache CouchDB. Esta continuación responde otra pregunta: si perdemos el volumen o la máquina, ¿podemos recuperar el inventario y comprobar que la copia sirve?

El resultado de esta etapa es un procedimiento reproducible de **copia física cifrada y restauración aislada**, acompañado de una prueba real en GitHub Actions.

## Código y evidencias

- [Repositorio público de la aplicación](https://github.com/CodexVex/TechInventory).
- [Script de respaldo y restauración: backup.sh](https://github.com/CodexVex/TechInventory/blob/main/backup.sh).
- [Prueba de recuperación exitosa del 16/11/2026](https://github.com/CodexVex/TechInventory/actions/runs/43811669503).
- [CI de aplicación exitoso](https://github.com/CodexVex/TechInventory/actions/runs/43811669548).
- [Construcción del video narrado: 182,44 segundos y pista de audio verificada](https://github.com/CodexVex/TechInventory/actions/runs/43812440607).

## Un volumen y una revisión resuelven problemas distintos

El volumen de Docker conserva los archivos cuando cambiamos o reiniciamos un contenedor. Si eliminamos el volumen o falla su almacenamiento, esa persistencia deja de ayudarnos. Por eso necesitamos una copia independiente.

Tampoco usamos `_rev` como historial de recuperación. En nuestra aplicación la revisión permite detectar una edición concurrente y responder con un conflicto. No garantiza que podamos regresar a cualquier estado anterior del inventario.

La replicación es otra herramienta útil, pero transmite cambios y eliminaciones. Sin versiones conservadas e independientes, puede propagar el mismo error que queremos reparar.

## Por qué elegimos una copia física en frío

TechInventory utiliza un solo nodo de CouchDB y un inventario académico pequeño. Aceptamos una pausa durante la captura para simplificar la consistencia. El objetivo no es demostrar alta disponibilidad.

La documentación oficial de CouchDB contempla tanto replicación como copia de sus archivos de base. Para esta implementación copiamos el volumen completo y la configuración con la base detenida. Restauramos con la misma imagen utilizada para crear la copia; no suponemos compatibilidad entre versiones diferentes.

El script sigue esta secuencia:

1. Comprueba la clave de cifrado y evita dos respaldos simultáneos con `flock`.
2. Detiene Express para impedir nuevas escrituras desde la aplicación.
3. Consulta CouchDB mediante un contenedor temporal de la aplicación y guarda una referencia de documentos, revisiones y permisos.
4. Detiene CouchDB, copia su directorio `etc` y empaqueta el volumen de datos.
5. Incluye el archivo de variables de la aplicación para conservar la configuración necesaria para reconstruirla.
6. Reinicia CouchDB y Express. La transferencia y el ensayo de restauración se realizan después de esa pausa.
7. Cifra el paquete, calcula su suma SHA-256 y, si se configuró el destino, lo transfiere al almacenamiento externo.

Se respalda todo el volumen de CouchDB, no solo un listado JSON de equipos. La evidencia pública contiene hashes y revisiones; no publica contraseñas ni el contenido completo del respaldo.

## Cifrado y destino externo

El paquete contiene datos y configuración sensible, por lo que se cifra mediante GnuPG con AES-256. La clave se proporciona mediante `BACKUP_PASSPHRASE_FILE` y debe custodiarse fuera del repositorio y del almacenamiento de las copias. Si se pierde, no podemos descifrar el respaldo.

SHA-256 permite detectar cambios en el archivo cifrado cuando lo comparamos con una suma de referencia confiable. La suma, por sí sola, no autentica a su autor: alguien con capacidad de reemplazar ambos archivos podría modificarlos juntos.

El destino externo elegido es **Azure Blob Storage privado**, separado del disco de la VM. El script permite subir el archivo cifrado y su suma mediante HTTPS y un SAS temporal con permisos limitados. La URL y el SAS no se publican. No afirmamos que esto complete una estrategia 3-2-1: seguimos dependiendo de un proveedor y no hay una tercera copia independiente ni redundancia geográfica demostrada.

## Restaurar antes de confiar

La prueba no termina cuando existe un archivo comprimido. El script verifica el SHA-256, descifra el archivo y extrae de nuevo su contenido; no reutiliza como prueba los archivos originales que quedaron en el directorio temporal.

Después crea otro proyecto Compose con un volumen y una red nuevos. Carga allí los archivos respaldados y arranca una instancia de CouchDB con la misma imagen. No sobrescribe el volumen del inventario original ni publica puertos de la instancia restaurada.

La comparación incluye el número de documentos, los identificadores y revisiones de los equipos, el hash del contenido de los documentos y el hash de `_security`. Si alguna comparación falla, el comando termina con error.

## Automatización y resultado observado

El workflow `backup-drill.yml` se ejecuta al cambiar el script de respaldo o el propio workflow en main. También se puede iniciar manualmente. Construye la aplicación, levanta CouchDB real, crea un equipo de demostración, genera una clave efímera y ejecuta la copia y restauración.

La [ejecución #2](https://github.com/CodexVex/TechInventory/actions/runs/43811669503) terminó con éxito. Su resultado registra:

```json
{"status":"PASS","isolatedRestore":true,"documentsAndRevisionsMatch":true,"securityMatches":true,"restoreSeconds":2,"completedAt":"2026-11-16T05:40:21Z"}
```

Los dos segundos corresponden únicamente al ensayo pequeño medido desde la verificación del archivo hasta la comparación. No representan el tiempo de aprovisionar una VM, descargar una copia desde Blob ni recuperar un servicio productivo.

El artefacto de Actions conserva los JSON de antes, después y resultado durante 30 días. No conserva el respaldo cifrado ni su clave: el runner contiene datos sintéticos desechables y se limpia al finalizar. Para revisión posterior conviene descargar esas evidencias; el código permanece en el repositorio.

## Despliegue automatizado y comprobación en Azure

La demostración del 16/11/2026 se ejecutó en una VM Ubuntu de **Azure for Students**, con Docker Compose y Caddy. El [script de despliegue](https://github.com/CodexVex/TechInventory/blob/main/deploy-azure-demo.sh) documenta el aprovisionamiento y la construcción automática. Este procedimiento por Azure CLI es independiente del workflow SSH de la primera entrega.

La API pública respondió por HTTPS con `{"status":"ok","database":"Apache CouchDB"}`. En la VM, el ensayo restauró tres documentos, incluyendo dos cuentas de aplicación y el equipo sintético `asset:BACKUP-AZURE`. Los documentos, revisiones y permisos coincidieron; el tramo de restauración medido tardó **6 segundos**.

El contenedor privado de Blob recibió un archivo cifrado de **24 897 bytes** y su suma de **108 bytes**. Después descargamos ambos desde Blob a Cloud Shell y la verificación SHA-256 devolvió **OK**. También comprobamos acceso público de blobs deshabilitado, HTTPS obligatorio y TLS 1.2 como mínimo.

La [evidencia de Azure](https://github.com/CodexVex/TechInventory/blob/main/evidence/backup/azure-verification.json) conserva esos resultados. El ensayo de restauración utilizó el archivo local cifrado; la descarga desde Blob se comprobó por separado. No presentamos esa descarga como un segundo ensayo completo de recuperación.

El alojamiento es temporal y se retira después de conservar las evidencias para controlar los créditos. Su URL de demostración no es un servicio permanente.

## Video con voz femenina

La explicación se generó con narración sintética femenina en español de Perú y una duración aproximada de **tres minutos**, inferior al límite de cinco. Están disponibles el [MP4 y sus archivos de validación](https://github.com/CodexVex/TechInventory/releases/tag/nosql-backup-demo-20261116). La publicación del MP4 en una red social de video se incorpora por separado; una descarga de GitHub no sustituye ese requisito de la entrega.

## Frecuencia, retención y límites

En este laboratorio el respaldo se ejecuta automáticamente dentro de cada ensayo y puede iniciarse antes de un cambio. Ese flujo valida el mecanismo; **no equivale a un respaldo diario programado de una base productiva**.

Para una operación continua proponemos una copia diaria y otra previa a cambios importantes, conservar siete copias diarias y cuatro semanales, y realizar ensayos periódicos desde el almacenamiento externo. Son lineamientos de operación, no tareas que esta demostración afirme haber ejecutado durante semanas.

El RPO depende de la última copia válida; con una programación diaria que funcione, el objetivo sería perder como máximo unas 24 horas de cambios. El RTO debe medirse con datos y condiciones representativos. Además se necesitan alertas de fallos, rotación de autorizaciones, custodia de claves y pruebas de acceso de los usuarios recuperados. Nuestro ensayo compara documentos y permisos, pero no prueba todos los escenarios de desastre ni la recuperación de un clúster distribuido.

El aprendizaje principal fue convertir la restauración en una condición verificable del proceso. Tener un archivo de backup es el inicio; poder reconstruir y comparar los datos es la evidencia útil.

## Referencias

- [Apache CouchDB: Backing up CouchDB](https://docs.couchdb.org/en/stable/maintenance/backups.html).
- [Apache CouchDB: replicación](https://docs.couchdb.org/en/stable/replication/intro.html).
- [Azure: autorización de acceso mediante SAS](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview).
- [Implementación y prueba pública de TechInventory](https://github.com/CodexVex/TechInventory).
