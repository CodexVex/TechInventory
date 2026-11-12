---
title: "TechInventory: cómo modelar un inventario con documentos y revisiones de Apache CouchDB"
published: false
tags: couchdb, node, react, database
---

# TechInventory: cómo modelar un inventario con documentos y revisiones de Apache CouchDB

Cuando se registra un equipo en un laboratorio, no basta con guardar su nombre. También interesa conocer dónde está, quién es responsable y si puede utilizarse. TechInventory organiza esa información mediante una aplicación con React, una API en Express y documentos JSON en Apache CouchDB.

El proyecto tiene un alcance concreto: registrar, consultar, actualizar y eliminar equipos; buscar por sus datos principales; filtrar por estado y mostrar un resumen. La base elegida es CouchDB real. No se reemplaza por una colección en memoria para simplificar el alojamiento.

## Por qué un documento por equipo

Un equipo reúne datos que suelen consultarse juntos. Por eso el documento incluye código, nombre, categoría, ubicación, responsable, estado y notas. El identificador se obtiene del código: un equipo LT-001 utiliza `asset:LT-001`. Las cuentas de acceso se distinguen con `type: user` y no aparecen en el listado del inventario.

Esta decisión tiene una consecuencia útil: dos altas concurrentes con el mismo código compiten por el mismo identificador. CouchDB acepta una y rechaza la otra. Una validación previa en la interfaz, por sí sola, no garantizaría esa unicidad.

El código queda fijo después del registro. De lo contrario, cambiarlo implicaría decidir cómo trasladar el documento y tratar referencias anteriores. Esa complejidad no forma parte del alcance de este trabajo.

## Una revisión evita sobrescribir cambios ajenos

CouchDB devuelve `_rev` al guardar un documento. La API conserva esa revisión y la exige para editar o eliminar. Si dos usuarios abren el mismo equipo y uno guarda primero, el segundo debe actualizar la información antes de volver a intentarlo.

En TechInventory el conflicto se convierte en HTTP 409 y en un mensaje que pide actualizar. No se reintenta de manera ciega con la revisión más reciente: hacerlo podría ocultar la pérdida de un cambio. La revisión es un mecanismo de concurrencia, no un historial de auditoría ni una copia de seguridad.

## El navegador no necesita conocer la base

React llama únicamente a rutas `/api`. Express valida cada entrada y construye el documento permitido. Las propiedades desconocidas se rechazan; un cliente no puede agregar su propio rol o cambiar el tipo de documento mediante el formulario de equipos.

La comunicación con CouchDB ocurre dentro de la red de Docker. El puerto 5984 no se publica al exterior. Las contraseñas de la base permanecen en variables del servidor y los usuarios de la aplicación tienen contraseñas derivadas con scrypt y una sal aleatoria.

Se diferencian dos roles: administración y consulta. Ocultar un botón en React facilita el uso, pero la autorización que protege los datos está en Express. Una cuenta de consulta recibe 403 si intenta escribir directamente contra la API.

## Cómo verificarlo sin confundir evidencias

El repositorio incluye dos niveles de prueba. `npm test` comprueba rutas, validación, sesión, protección CSRF, roles y conflictos usando un doble de la base. Estas pruebas son rápidas, pero no demuestran persistencia en CouchDB.

Para probar la integración se inicia Docker Compose y se ejecuta `npm run test:integration`. Esa prueba crea un código aleatorio, registra un documento, actualiza su estado, intenta una escritura con una revisión antigua, consulta el resultado y elimina el documento de prueba.

La comprobación de persistencia exige un paso adicional: registrar un equipo, reiniciar los contenedores y volver a consultar el mismo documento. El volumen `couchdata` conserva los archivos. Eliminar ese volumen eliminaría también la evidencia que se intenta comprobar.

El 12 de noviembre de 2026, la [ejecución CI #3](https://github.com/CodexVex/TechInventory/actions/runs/43322534919) terminó correctamente: seis pruebas de API y una integración con CouchDB real. La evidencia está en `evidence/ci-couchdb-real.txt` y `evidence/03-ci-exitoso.jpg`. La prueba de reinicio se documenta por separado: leer tras escribir no demuestra por sí solo persistencia entre reinicios.

## Lo que mejoraría al crecer

El listado actual recorre los documentos del inventario y filtra en el servidor. Es suficiente para una demostración pequeña, pero un inventario grande necesitaría índices Mango, paginación y límites explícitos. También agregaría historial de movimientos, recuperación de acceso y revocación central de sesiones.

CouchDB aporta documentos y control de concurrencia; no resuelve por sí mismo el diseño de permisos, las copias de seguridad o la experiencia de uso. La parte más valiosa del proyecto es poder explicar esas responsabilidades y comprobarlas por separado.

## Código y referencias

- [Repositorio TechInventory](https://github.com/CodexVex/TechInventory)
- [Ejecuciones de validación](https://github.com/CodexVex/TechInventory/actions)
- [API de documentos de CouchDB](https://docs.couchdb.org/en/stable/api/document/common.html)
- [Control de conflictos](https://docs.couchdb.org/en/stable/replication/conflicts.html)
- [Instalación oficial con Docker](https://docs.couchdb.org/en/stable/install/docker.html)

Nota editorial: preparado como artículo original para el integrante que explique el modelo documental. Revisar autoría y añadir los enlaces públicos del despliegue y video cuando existan; no publicar marcadores como si fueran resultados.
