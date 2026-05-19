# Plan de Pruebas por Caso de Uso — Literatus Novelist

Este documento vincula los Casos de Uso (C.U.) del sistema con los 28 Casos de Prueba (TC) definidos en el archivo de control `Casos de Prueba - LiteratusNovelist V2.xlsx`. El Excel actúa como fuente de verdad y este documento ofrece la descripción formal detallada para cada uno de ellos.

---

## 1. Módulo: Registro y Login

### TC-01: Registro de nuevo usuario con bono
*   **Caso de Uso Asociado:** `CU-01: Registrar Cuenta de Usuario`.
*   **Pasos:**
    1. Acceder a `/signup`.
    2. Ingresar datos válidos.
    3. Hacer clic en 'Registrar'.
*   **Resultado Esperado:** Usuario creado exitosamente en la base de datos PostgreSQL (`auth_user`) y se asigna un saldo inicial automático de 150 unidades de "Tinta" en su billetera (`Wallet`).

### TC-02: Login con JWT
*   **Caso de Uso Asociado:** `CU-02: Iniciar Sesión`.
*   **Pasos:**
    1. Ingresar credenciales válidas en la vista `/login`.
    2. Hacer clic en 'Entrar'.
*   **Resultado Esperado:** Acceso concedido, retorno HTTP 200 con tokens `access` y `refresh` JWT, almacenados correctamente en el cliente para mantener la sesión activa.

### TC-11: Registro con correo duplicado
*   **Caso de Uso Asociado:** `CU-01: Registrar Cuenta de Usuario`.
*   **Pasos:**
    1. Acceder a `/signup`.
    2. Ingresar un correo ya registrado.
    3. Intentar registrar.
*   **Resultado Esperado:** El backend responde con HTTP 400 Bad Request y el frontend muestra una alerta indicando que el correo electrónico ya está en uso.

### TC-12: Registro con clave insegura
*   **Caso de Uso Asociado:** `CU-01: Registrar Cuenta de Usuario`.
*   **Pasos:**
    1. Acceder a `/signup`.
    2. Ingresar datos con clave menor a 8 caracteres o sin combinación de letras y números.
    3. Registrar.
*   **Resultado Esperado:** El sistema detiene la solicitud tanto en el cliente como en el servidor, mostrando una advertencia de seguridad.

### TC-13: Login con credenciales incorrectas
*   **Caso de Uso Asociado:** `CU-02: Iniciar Sesión`.
*   **Pasos:**
    1. Acceder a `/login`.
    2. Ingresar clave errónea o correo inexistente.
    3. Entrar.
*   **Resultado Esperado:** El backend responde con HTTP 401 Unauthorized, borrando los campos en el cliente y mostrando un mensaje de error.

### TC-14: Renovación automática de Token (Refresh)
*   **Caso de Uso Asociado:** `CU-02: Iniciar Sesión`.
*   **Pasos:**
    1. Simular expiración del Access Token JWT.
    2. Realizar petición protegida al backend.
*   **Resultado Esperado:** El interceptor HTTP de Angular solicita un nuevo Access Token al endpoint de refresh usando el token guardado sin interrumpir la sesión ni la experiencia de usuario.

---

## 2. Módulo: Home

### TC-03: Visualización de secciones (Bento Grid)
*   **Caso de Uso Asociado:** `CU-03: Explorar Catálogo de Libros`.
*   **Pasos:**
    1. Cargar la página de inicio.
    2. Verificar la distribución de elementos.
*   **Resultado Esperado:** La interfaz muestra el diseño Bento Grid con estética Glassmorphism de forma organizada y responsiva.

---

## 3. Módulo: Catalogo

### TC-04: Filtrado de obras por género/dificultad
*   **Caso de Uso Asociado:** `CU-03: Explorar Catálogo de Libros`.
*   **Pasos:**
    1. Entrar al catálogo.
    2. Seleccionar un filtro de género.
*   **Resultado Esperado:** La lista de libros se actualiza mostrando solo las obras que coinciden con el filtro seleccionado.

### TC-15: Carga del catálogo completo
*   **Caso de Uso Asociado:** `CU-03: Explorar Catálogo de Libros`.
*   **Pasos:**
    1. Acceder a `/catalog`.
    2. Verificar tiempo de carga y renderizado de portadas.
*   **Resultado Esperado:** La lista de más de 1,800 obras carga en menos de 1.5 segundos con paginación fluida y lazy loading de portadas.

### TC-16: Búsqueda sin resultados
*   **Caso de Uso Asociado:** `CU-03: Explorar Catálogo de Libros`.
*   **Pasos:**
    1. Acceder a `/catalog`.
    2. Ingresar texto aleatorio en el buscador.
*   **Resultado Esperado:** La grilla de libros se actualiza mostrando el mensaje amigable: "No se encontraron obras coincidentes".

---

## 4. Módulo: Compra Libro

### TC-05: Adquisición de obra con Tinta
*   **Caso de Uso Asociado:** `CU-04: Adquirir Libro (Pago o Tinta)`.
*   **Pasos:**
    1. Seleccionar un libro premium no poseído.
    2. Hacer clic en 'Comprar'.
*   **Resultado Esperado:** Se realiza una transacción atómica; el saldo de tinta del usuario se descuenta en la tabla `Wallet` y el libro se añade a su biblioteca personal.

### TC-17: Compra con pasarela Transbank (Éxito)
*   **Caso de Uso Asociado:** `CU-04: Adquirir Libro (Pago o Tinta)`.
*   **Pasos:**
    1. Seleccionar un libro premium.
    2. Elegir pago con Webpay.
    3. Completar transacción de pago exitosa en el sandbox de Transbank.
*   **Resultado Esperado:** Redirección de retorno al comercio, confirmación del pago exitoso en el backend y habilitación permanente del libro en la biblioteca.

### TC-18: Compra con pasarela Transbank (Cancelado)
*   **Caso de Uso Asociado:** `CU-04: Adquirir Libro (Pago o Tinta)`.
*   **Pasos:**
    1. Iniciar pago con Webpay.
    2. Pulsar el botón "Anular y volver al comercio" en el portal bancario.
*   **Resultado Esperado:** El backend detecta la cancelación, ejecuta rollback de registros temporales para evitar transacciones fantasmas y notifica la anulación al usuario en el cliente.

---

## 5. Módulo: Detalles y Sinopsis

### TC-06: Visualización Full-Page de obra
*   **Caso de Uso Asociado:** `CU-03: Explorar Catálogo de Libros`.
*   **Pasos:**
    1. Clic en un libro del catálogo.
    2. Revisar la sinopsis y detalles.
*   **Resultado Esperado:** Se despliega la vista completa con sinopsis estructurada por IA, biografía del autor y avatares de personajes interactivos.

---

## 6. Módulo: Lectura y Texto

### TC-07: Carga de lector EPUB
*   **Caso de Uso Asociado:** `CU-05: Leer un Libro (Lector EPUB)`.
*   **Pasos:**
    1. Abrir un libro adquirido.
    2. Navegar entre páginas.
*   **Resultado Esperado:** El archivo EPUB se visualiza correctamente con disposición de texto fluida y responsiva.

### TC-10: Navegación por estructura de la obra (TOC)
*   **Caso de Uso Asociado:** `CU-05: Leer un Libro (Lector EPUB)`.
*   **Pasos:**
    1. Abrir menú de navegación (TOC) dentro del libro.
    2. Seleccionar un capítulo específico.
*   **Resultado Esperado:** El lector salta inmediatamente a la posición del capítulo seleccionado.

### TC-19: Guardado automático de progreso de lectura
*   **Caso de Uso Asociado:** `CU-05: Leer un Libro (Lector EPUB)`.
*   **Pasos:**
    1. Abrir libro en el lector.
    2. Leer un fragmento y cambiar de capítulo o cerrar la pestaña del lector.
*   **Resultado Esperado:** El sistema despacha un evento asíncrono al backend guardando el ID del capítulo y la posición de scroll en la base de datos para futuras sesiones.

### TC-20: Cambio de tema a Modo Oscuro
*   **Caso de Uso Asociado:** `CU-05: Leer un Libro (Lector EPUB)`.
*   **Pasos:**
    1. En el lector EPUB, abrir menú de estilos.
    2. Seleccionar Tema Oscuro.
*   **Resultado Esperado:** Los estilos del componente cambian de color de fondo y texto adecuadamente garantizando la legibilidad en entornos oscuros.

---

## 7. Módulo: Reproducción y Audio

### TC-21: Activar Narración Karaoke (Audio-Sync Grabado)
*   **Caso de Uso Asociado:** `CU-06: Activar Narración Karaoke`.
*   **Pasos:**
    1. En el lector, activar reproducción de audio.
    2. Verificar subrayado de texto.
*   **Resultado Esperado:** El reproductor inicia el stream de Piper TTS y subraya secuencialmente las palabras en base al JSON de alineación de Whisper.

### TC-22: Navegación interactiva por clic en palabra
*   **Caso de Uso Asociado:** `CU-06: Activar Narración Karaoke`.
*   **Pasos:**
    1. Durante reproducción, hacer clic en una palabra futura del párrafo.
*   **Resultado Esperado:** El reproductor de audio salta exactamente al tiempo de reproducción correspondiente a esa palabra y continúa la narración desde allí.

### TC-23: Sincronización por voz nativa del navegador
*   **Caso de Uso Asociado:** `CU-06: Activar Narración Karaoke`.
*   **Pasos:**
    1. Seleccionar el Modo Voz Nativa.
    2. Iniciar reproducción del capítulo.
*   **Resultado Esperado:** El motor `window.speechSynthesis` vocaliza el texto en cliente y el evento `onboundary` actualiza reactivamente el resaltado mediante RxJS.

---

## 8. Módulo: Chat con Personajes

### TC-08: Inmersión narrativa con IA
*   **Caso de Uso Asociado:** `CU-07: Chatear con Personaje de IA`.
*   **Pasos:**
    1. Seleccionar un personaje (ej. *El Principito*).
    2. Enviar mensaje de chat.
*   **Resultado Esperado:** La IA (Gemini 2.0) responde en primera persona, manteniendo la personalidad y contexto histórico del personaje.

### TC-24: Manejo de contexto largo en conversación con IA
*   **Caso de Uso Asociado:** `CU-07: Chatear con Personaje de IA`.
*   **Pasos:**
    1. Iniciar chat con un personaje.
    2. Mantener conversación por más de 15 turnos.
*   **Resultado Esperado:** El modelo mantiene la coherencia y memoria de los hechos acordados previamente en la conversación sin exceder la ventana de tokens.

---

## 9. Módulo: Avatar e IA

### TC-09: Conversación contextual por avatar
*   **Caso de Uso Asociado:** `CU-07: Chatear con Personaje de IA` / `CU-11: Ver Avatares Manga`.
*   **Pasos:**
    1. Acceder al chat desde el avatar del personaje.
    2. Realizar pregunta sobre la trama.
*   **Resultado Esperado:** El sistema utiliza el motor de IA (Gemini 2.0 Flash) para proveer respuestas basadas en la obra específica y contexto del personaje.

### TC-28: Visualización de Avatares Manga Dinámicos
*   **Caso de Uso Asociado:** `CU-11: Ver Avatares Manga del Personaje`.
*   **Pasos:**
    1. Chatear con un personaje literario.
    2. Provocar emociones en el diálogo (ej. hacer preguntas tristes).
*   **Resultado Esperado:** El frontend detecta la emoción de respuesta devuelta en la cabecera/metadatos de Gemini y cambia el frame manga correspondiente (triste, alegre, neutral).

---

## 10. Módulo: Llamada de Voz

### TC-25: Llamada de voz interactiva con personajes
*   **Caso de Uso Asociado:** `CU-08: Llamada de Voz con Personaje`.
*   **Pasos:**
    1. Iniciar llamada con personaje.
    2. Hablar por micrófono.
    3. Escuchar respuesta.
*   **Resultado Esperado:** La Web Speech API transcribe la voz del usuario localmente, Gemini procesa la respuesta en backend, y Piper TTS reproduce la respuesta en audio en el frontend de forma fluida.

---

## 11. Módulo: Administración

### TC-26: Subida masiva de libros en el Panel Nexus
*   **Caso de Uso Asociado:** `CU-09: Administrar Catálogo (Panel Nexus)`.
*   **Pasos:**
    1. Subir archivo `.epub` con caracteres especiales en el TOC o nombres de archivos internos.
*   **Resultado Esperado:** El script `bulk_db_injection.py` procesa y decodifica las rutas usando `unquote` e inyecta la obra y capítulos en PostgreSQL sin fallos de codificación.

---

## 12. Módulo: Economía y Pagos

### TC-27: Validación de Historial Transaccional
*   **Caso de Uso Asociado:** `CU-10: Gestionar Economía (La Taberna)`.
*   **Pasos:**
    1. En La Taberna, hacer clic en "Ver Historial de Transacciones".
*   **Resultado Esperado:** Se despliega el ledger contable con el desglose exacto de ingresos (compras Webpay) y egresos (libros adquiridos).
