# Alojamiento: revisión del 12 de noviembre de 2026

| Opción | Condición observada | Decisión |
|---|---|---|
| Render Free | 750 horas/mes por workspace; reposo tras 15 minutos; sin disco persistente gratuito | No alojar CouchDB persistente aquí |
| Azure for Students | Oferta de US$100 durante 12 meses sin tarjeta; elegibilidad académica | Cuenta real comprobada: activa, spendingLimit=On; portal muestra ~US$94,33 y vencimiento 23/03/2027 |
| VM Azure B1ms East US | API oficial de precios: US$0,0207/h Linux, ~US$15,11 por 730 h; disco e IP adicionales | Propuesta hasta US$25/mes de crédito, pendiente de autorización específica de consumo |
| GitHub Pages / sitios estáticos | Sirven frontend; no ejecutan Express ni CouchDB | No cumplen solos la arquitectura |

No se presupone que un beneficio del Student Pack siga vigente ni que ya esté activado. Consultar el catálogo oficial y la cuenta concreta. No se ha activado pago por uso.

Una estimación de US$25/mes no es un tope técnico de Azure. El límite de gasto protege el crédito total, no una suma mensual personalizada. Detener y desalojar la VM evita cómputo, pero disco e IP pueden seguir consumiendo saldo. Eliminar los recursos del proyecto al finalizar requiere respaldar los documentos primero.

Fuentes verificadas:
- https://render.com/docs/free
- https://azure.microsoft.com/en-us/free/students/
- https://education.github.com/pack
- https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit
- https://prices.azure.com/api/retail/prices (filtro East US, Standard_B1ms, Consumption)
