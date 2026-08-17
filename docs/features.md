# Funcionalidades

Inventario de la funcionalidad de la aplicación. Este documento distingue lo que está **implementado** de lo que está **pendiente**, para conocer el estado actual del producto de un vistazo.

- **Implementado** — funcionalidades que existen, funcionan y están disponibles en la app.
- **Pendiente** — funcionalidad planificada o solicitada que aún no se construyó. Agregar nuevos ítems a esta sección a medida que se definan.

---

## Implementado

### Gestión de rondas

| Funcionalidad | Descripción |
|---|---|
| Listado de rondas | Pantalla principal que muestra cada ronda: fecha, golpes totales y estado (En curso / Completada), ordenadas de más reciente a más antigua. |
| Iniciar nueva ronda | Abre el modal de hoyo inicial (hoyo 1, shotgun o salida desde el 10), crea la ronda y pasa a la vista de juego. |
| IDs de ronda por fecha | Las rondas se identifican por fecha (`dd-mm-yyyy`), con sufijo `-N` para múltiples rondas el mismo día. |
| Reanudar / ver ronda | Reanuda una ronda en curso en el hoyo guardado; las rondas completadas abren directo al scorecard. |
| Eliminar ronda | Elimina una ronda localmente y en la nube, tras confirmación. |
| Sincronización manual por ronda | Sincroniza una ronda individual con Google Sheets, con estado de carga mientras se ejecuta. |
| Jugadores invitados | Permite agregar 0–2 jugadores invitados con nombre al crear la ronda; los golpes por hoyo (approach + putts) se registran y se muestran por jugador en el scorecard. |

### Juego / tracking por hoyo

| Funcionalidad | Descripción |
|---|---|
| Contadores de golpes | Contadores separados para approaches y putts (mínimo 0). |
| Grilla de selección de palo | Selecciona el palo utilizado entre 12 opciones (`1w 3w 4i–9i Pw Sd 60 LostBall`); los approaches requieren palo seleccionado. |
| Manejo de bola perdida | Registra el golpe de penalidad sin ubicación GPS. |
| Registro de golpes con GPS | Geolocalización de alta precisión registra las coordenadas de cada approach, con fallback cuando falla la ubicación. |
| Detalle de golpes | Cada approach guarda palo, timestamp, ubicación, distancia calculada y flag de estadística. |
| Cálculo de distancia | Distancia Haversine desde el tee o el último golpe hasta la ubicación actual, en yardas. |
| Distancia "Al Green" en vivo | Distancia en tiempo real desde la última posición conocida hasta el centro del green. |
| Flag de estadística | Marca un golpe como representativo (STATS) o excluido (NO STATS) para las estadísticas. |
| Navegación circular de hoyos | Anterior / Siguiente envuelve entre los hoyos 1–18, acotado por el hoyo inicial. |
| Finalizar ronda | Confirma, guarda en Google Sheets, marca la ronda completada y vuelve al listado. |
| Mapa del hoyo | Imagen a pantalla completa del hoyo actual (`/fields/CdeC/hoyo-N.jpg`). |
| Posición de tee automática | Las coordenadas del tee se inyectan desde los datos del campo al crear, navegar o reanudar una ronda. |
| Editar ronda completada | Reabre una ronda completada en modo edición desde el scorecard y la resincroniza. |

### Scorecard y estadísticas

| Funcionalidad | Descripción |
|---|---|
| Totales y resultado al par | Golpes totales, resultado relativo al par (`E`, `+N`, `-N`) y par de los hoyos jugados. |
| Distribución de resultados | Gráfico de barras segmentado: Águilas o mejor, Birdies, Pares, Bogeys, Doble, Triple y Otros. |
| Filas de hoyo expandibles | Tabla de golpes por hoyo (palo, distancia, hora) más coordenadas del tee y comparación con otros jugadores. |
| Código de colores | Resultados de hoyo por color según la relación con el par (águila+, birdie, par, sin jugar). |
| Vistas por jugador | El jugador principal y los invitados tienen totales y distribución independientes. |

### Perfil del jugador

| Funcionalidad | Descripción |
|---|---|
| Hándicap estimado (WHS) | Índice con un decimal calculado sobre rondas completas de 18 hoyos: doble bogey neto por hoyo, diferencial `(Score Bruto Ajustado − Course Rating − PCC) × 113 / Slope` y promedio de los mejores 8 de las últimas 20. Usa defaults de golf: Slope 113, Course Rating = Par, PCC 0. |
| Desglose del hándicap | Lista las rondas que entran al cálculo con su score bruto, ajustado y diferencial, marcando cuáles se promedian. |

### Driving range

| Funcionalidad | Descripción |
|---|---|
| Inicio de sesión | Selecciona el palo de práctica: Driver, Madera, Hierro largo o Hierro corto. |
| Grilla de objetivos | Cinco zonas objetivo codificadas por color (extremo izq. / izq. / centro / der. / extremo der.) con conteo en vivo de golpes. |
| Deshacer último golpe | Elimina el golpe registrado más recientemente. |
| Estadísticas en vivo | Porcentajes en tiempo real de Acierto, Aceptable y Fallado, más ratios de desvío izquierda/derecha. |
| Finalizar y guardar | Guarda la sesión en Google Sheets; si falla, la conserva localmente y avisa. |
| Descartar sesión | Descarta la sesión local tras confirmación. |
| Historial agrupado por día | Sesiones agrupadas por día calendario con paginación hacia entradas antiguas. |
| Eliminar sesión guardada | Elimina una sesión almacenada localmente y en la nube, tras confirmación. |
| Merge local + remoto | Las sesiones sin finalizar quedan locales; las finalizadas usan el remoto como fuente de verdad. |

### Tema y UI

| Funcionalidad | Descripción |
|---|---|
| Temas Moderno / Alto Contraste | Cambio de tema mediante el atributo `data-theme` y variables CSS (no Tailwind `dark:`). |
| Persistencia del tema | El tema se guarda en `localStorage` y se restaura al montar. |
| Toggle de tema | Control de cambio de tema en el menú de la app. |
| Menú de la app | Drawer deslizable de navegación entre las vistas principales. |
| Pantalla de inicio | Splash con barra de carga al iniciar. |
| Modal de información | Reemplaza los alerts del navegador para mensajes de éxito / error / info. |
| Modal de confirmación | Diálogo reutilizable con texto, colores y cancelación opcional configurables. |
| Indicador de versión | Versión de la app mostrada en el header/footer de las pantallas principales. |

### Sincronización, persistencia e infraestructura

| Funcionalidad | Descripción |
|---|---|
| Sync de rondas (guardar/eliminar/obtener) | CRUD completo de rondas contra Google Sheets vía Google Apps Script Web App. |
| Sync de sesiones de driving | Guardar, eliminar y obtener con paginación de sesiones de driving. |
| Bypass de CORS preflight | Los POST usan `Content-Type: text/plain;charset=utf-8` para evitar el preflight. |
| Cache busting | Los GET agregan un parámetro de timestamp para evitar datos cacheados obsoletos. |
| Override de API por entorno | URL de la API configurable vía `VITE_GOOGLE_SHEETS_API_URL`, con fallback a la URL de producción. |
| Modal de conflicto de sync | Al iniciar (online), las rondas solo locales disparan una decisión de conservar/merge vs. descartar. |
| Persistencia local | Rondas, sesiones de driving y tema guardados en `localStorage`. |
| Navegación de cuatro vistas | Vistas `rounds`, `play`, `scorecard` y `driving` gestionadas por estado de la app. |
| Configuración de Capacitor | Wrapper móvil configurado (`com.golfapp.scorecard`); las plataformas se generan localmente. |
| Infraestructura de tests unitarios | Vitest + jsdom + Testing Library configurados con tests unitarios de geo, score y datos del campo. |

---

## Pendiente

Funcionalidades planificadas o solicitadas que aún no se implementaron. Están agrupadas en fases según el plan de dependencias e impacto.

> **Estado:** `✅ Implementado` = ítem ya construido; se conserva en la lista como registro del historial.

### Fase 1 — Quick wins (derivables de datos ya capturados)

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-02 | Cantidad de bolas perdidas | Estadísticas por ronda | ✅ Implementado | Lleva un registro rápido de las pelotas extraviadas o jugadas fuera de límites en cada vuelta, ayudando a identificar el impacto directo de las penalizaciones en el score. | Deriva del palo `LostBall` ya registrado en cada golpe. |
| P-03 | Mayor distancia obtenida por palo | Estadísticas por ronda | ✅ Implementado | Almacena el golpe más largo ejecutado con éxito para cada palo específico de la bolsa durante la ronda, dando una referencia real del rendimiento máximo del día. | `ShotDetail` ya guarda palo + distancia. |
| P-04 | Cálculo del hándicap estimado | Perfil del jugador | ✅ Implementado | Calcula y actualiza automáticamente el nivel de juego estimado en función de las últimas rondas completadas de 18 hoyos. | WHS sobre rondas de 18 hoyos. |
| P-06 | Promedio de bolas perdidas (últimas 5 rondas) | Perfil del jugador | ✅ Implementado | Indicador estratégico que promedia las pelotas perdidas en los últimos 5 recorridos para evaluar si se están tomando decisiones más seguras en el campo. | Solo rondas finalizadas de 18 hoyos. Depende de P-02. |
| P-07 | Mayor distancia histórica por palo (últimas 10 rondas) | Perfil del jugador | ✅ Implementado | Consolida los tiros más largos logrados con cada palo en las últimas 10 vueltas, permitiendo armar la tabla de distancias máximas reales. | Tiros STATS con accuracy ≤20 m y distancia ≤290 y, en rondas finalizadas de 18 hoyos. Depende de P-03. |

### Fase 2 — Requieren nuevas fuentes de datos

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-01 | Fairway Hit (primer golpe en calle) | Estadísticas por ronda | ✅ Implementado | Mide la precisión de salida en hoyos par 4 y par 5, registrando si el tiro desde el tee aterriza en el fairway o se desvía al rough o zonas de penalidad. | Toggle manual en el tee shot (par 4/5); sin polígonos de fairway. |
| P-05 | Porcentaje de acierto en calle (últimas 5 rondas) | Perfil del jugador | | Analiza la consistencia a corto plazo calculando la media de primeros golpes que se lograron mantener en el fairway en las últimas 5 partidas. | Depende de P-01. |
| P-10 | Vista satelital del hoyo | Dentro de cada ronda | | Despliega un mapa aéreo detallado y de alta resolución de cada hoyo para identificar búnkers, obstáculos de agua y dog-legs antes de jugar. | Requiere tiles / fuente de mapas. |

### Fase 3 — "Mi Bolsa" y dependientes

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-08 | Configuración de "Mi Bolsa" | Perfil del jugador | | Panel dedicado para gestionar el equipamiento: dar de alta palos específicos, personalizar las distancias estimadas de referencia y configurar sus características físicas. | Dependencia clave: hoy el palo es un enum fijo de 12, sin concepto de bolsa. |
| P-09 | Mapeo de la bolsa y análisis de brechas (Gapping Analysis) | Perfil del jugador | | Gráfico dinámico en el perfil que analiza la progresión de las distancias y alerta visualmente sobre "solapamientos" (palos distintos con los que se hace la misma distancia) o "huecos" (brechas mayores a 15 yardas sin cubrir entre palos). | Depende de P-08. |
| P-13 | Confirmación de Bolsa Activa (Pre-ronda) | Dentro de cada ronda | | Pantalla de verificación rápida antes de iniciar el juego para confirmar qué palos de "Mi Bolsa" se llevan físicamente al campo, sirviendo de filtro directo para el asistente. | Depende de P-08. |
| P-16 | Recomendación inteligente de palo (Caddie Virtual con IA) | Dentro de cada ronda | | Asistente en pantalla que analiza la distancia GPS restante hasta el green y la cruza con la base de datos de "Mi Bolsa" activa para sugerir proactivamente el palo ideal para el próximo golpe. | Depende de P-08 y P-10. |

### Fase 4 — Vista satelital y dependientes

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-11 | Ajuste del punto de salida (setting de geoposición) | Dentro de cada ronda | | Permite establecer manualmente la posición exacta desde donde se inicia el juego en el tee de salida de cada hoyo, garantizando la máxima precisión en las mediciones de GPS. | Depende de P-10. |
| P-12 | Ubicación actual en tiempo real | Dentro de cada ronda | | Muestra la posición exacta sobre la imagen satelital del hoyo utilizando el GPS del dispositivo móvil. | Depende de P-10. |
| P-14 | Marcación manual de aterrizaje de bola | Dentro de cada ronda | | Permite tocar la pantalla en la vista satelital para marcar dónde reposa la pelota, registrando la posición, calculando la distancia del tiro anterior y construyendo el historial golpe a golpe. | Depende de P-10. |

### Fase 5 — Asistentes y reglas

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-15 | Asistente de voz manos libres (Golpe y Palo) | Dentro de cada ronda | | Control de juego por voz: al llegar a la pelota, se le indica verbalmente al sistema qué palo se usó; la app geolocaliza la posición, registra el golpe, calcula la distancia del tiro anterior y dicta por audio cuántas yardas restan al centro del green. | |
| P-17 | Chat de consulta de reglamento | Reglas | | Asistente interactivo de reglas con IA para resolver cualquier situación dudosa o conflicto en el fairway de forma instantánea; consulta por chat en lenguaje natural para obtener opciones de alivio claras (con o sin penalización) según el reglamento oficial. | |

### Fase 6 — Infraestructura y datos

| ID | Funcionalidad | Área | Estado | Descripción | Notas |
|---|---|---|---|---|---|
| P-18 | Persistencia local de datos (SQLite / Mobile DB) | Infraestructura y datos | | Almacenamiento local optimizado y de alta velocidad en el dispositivo para guardar perfiles, historial de rondas, golpes geolocalizados y configuración de bolsa; garantiza una experiencia fluida y un funcionamiento 100% offline en campos sin cobertura de red. | |
| P-19 | Generador de backup incremental post-ronda | Infraestructura y datos | | Sistema automático de resguardo que se ejecuta de forma transparente en segundo plano inmediatamente después de finalizar y cerrar cada ronda; recopila e integra únicamente los datos nuevos en la nube, optimizando batería y datos móviles. | |
