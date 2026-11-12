# Especificación funcional final

Objetivo: controlar equipos de un laboratorio o una organización pequeña, demostrar persistencia documental y automatizar validación/despliegue. Equipo de dos personas, artículos en español y video público de hasta cinco minutos.

## Criterios de aceptación

1. Usuario no autenticado no puede leer ni modificar activos.
2. Administrador registra un equipo con código único, nombre, categoría, ubicación, responsable, estado y notas opcionales.
3. Una entrada inválida recibe 400; un código duplicado o revisión obsoleta recibe 409.
4. Se pueden listar, buscar, filtrar, editar y eliminar con confirmación.
5. El código permanece fijo durante la edición. La revisión evita actualizaciones perdidas.
6. El usuario de consulta lee inventario y estadísticas pero recibe 403 al escribir.
7. Las estadísticas reflejan total y estados del inventario general, independientemente del filtro.
8. Reiniciar contenedores conserva equipos gracias al volumen persistente.
9. El frontend no contiene credenciales de CouchDB; 5984 no está expuesto públicamente.
10. GitHub Actions valida antes de desplegar el commit comprobado.

## Organización sugerida, sin atribuir trabajo no realizado

Integrante 1: modelo documental, API, validación, pruebas y artículo de CouchDB.
Integrante 2: interfaz, contenedores, automatización, alojamiento y artículo de despliegue.
Ambos deben revisar el código, repetir la demostración y personalizar sus publicaciones con su experiencia real. No inventar autores, contribuciones, métricas o dificultades.

## Límites

No incluye compras, depreciación, códigos de barras, préstamos con historial, archivos adjuntos, sincronización offline o alta disponibilidad. El diseño prioriza terminar y poder explicar el funcionamiento.

## Redacción

Problema concreto → decisión justificada → implementación reproducible → verificación observada → límites y aprendizaje. Lenguaje directo y técnico comprensible. Diferenciar claramente código preparado, prueba ejecutada y publicación confirmada. Cada integrante debe incorporar su nombre y revisar el texto antes de publicarlo en su cuenta. No atribuir resultados de cloud hasta verificarlos.
