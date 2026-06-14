# Prompt de auditoría y mejora completa para Literatus Novelist

> **Contexto:** Este prompt debe ser ejecutado por un agente de codificación con acceso al repositorio completo de `LiteratusNovelist`. El agente tiene conocimiento previo del proyecto (arquitectura Angular 17.3 + Django 6 + PostgreSQL + Supabase + Render + Vercel). El objetivo es transformar el estado actual de "prototipo académico funcional" a "producto listo para producción con seguridad mínima viable".

---

## 0. Preparación antes de tocar código

1. Hacer backup de `Producto/backend/config/settings.py` y `Producto/frontend/src/environments/environment.prod.ts`.
2. Verificar que el backend actual en Render responde (`https://literatus-novelist-backend.onrender.com/api/v1/catalog/books/`).
3. Verificar que el frontend en Vercel responde (`https://literatus-novelist.vercel.app/`).
4. Listar todas las variables de entorno que el backend lee del `.env` en Render (se usa `django-environ`).

---

## 1. SEGURIDAD CRÍTICA (Prioridad 1 — Bloqueante para producción)

### 1.1 `DEBUG = True` en settings.py
- **Archivo:** `Producto/backend/config/settings.py` (línea 36)
- **Problema:** Django está en modo debug en producción. Cualquier error expone stack traces, rutas de archivo y queries SQL.
- **Acción:**
  ```python
  DEBUG = env('DEBUG', default=False)
  ```
  Asegurar que en Render la variable de entorno `DEBUG` esté en `False`.
- **Verificación:** Visitar una URL inexistente en el backend. Debe devolver un 404 genérico, no el debug page de Django.

### 1.2 `ALLOWED_HOSTS = ['*']`
- **Archivo:** `Producto/backend/config/settings.py` (línea 37)
- **Problema:** Permite host-header attacks.
- **Acción:**
  ```python
  ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost'])
  ```
  En Render, agregar `literatus-novelist-backend.onrender.com` a la variable `ALLOWED_HOSTS`.
- **Verificación:** Intentar hacer una petición con un header `Host: evil.com` contra el backend. Debe devolver 400 Bad Request.

### 1.3 CORS demasiado permisivo
- **Archivo:** `Producto/backend/config/settings.py` (líneas 159-164)
- **Problema:** La lista default solo tiene `localhost`. Si no se sobreescribe con variable de entorno, o se permite `*`, es un riesgo.
- **Acción:**
  ```python
  CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
      'https://literatus-novelist.vercel.app',
      'http://localhost:4200',
  ])
  ```
  En Render, asegurar que `CORS_ALLOWED_ORIGINS` incluya exactamente `https://literatus-novelist.vercel.app`.
  **Eliminar cualquier wildcard (`*`) en producción.**
- **Verificación:** Petición `OPTIONS` desde un origin no autorizado debe ser bloqueada.

### 1.4 Transbank en modo Integración
- **Archivo:** `Producto/backend/config/settings.py` (líneas 237-240)
- **Problema:** `WEBPAY_ENVIRONMENT` defaultea a `INTEGRACION`. Si no hay variable de entorno en Render, los pagos reales van al ambiente de prueba.
- **Acción:**
  - **Opción A (si ya tiene certificación comercial):** Cambiar `default='INTEGRACION'` a `default='PRODUCCION'` y asegurar que `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY` sean los de producción en Render.
  - **Opción B (si no tiene certificación):** Mantener integración, pero agregar un banner claro en el checkout que diga "Ambiente de prueba — No ingrese datos reales de tarjeta". Esto evita problemas legales.
- **Verificación:** Revisar el último log de transacción en Render para confirmar a qué URL de Transbank apuntó.

### 1.5 `SUPABASE_KEY` hardcodeada en el bundle de Angular
- **Archivo:** `Producto/frontend/src/environments/environment.prod.ts` (línea 5)
- **Problema:** La API key anónima de Supabase está compilada en el JavaScript público. Cualquiera la puede extraer.
- **Acción inmediata:**
  1. **Activar Row Level Security (RLS)** en TODAS las tablas/buckets de Supabase (`literatus-media` bucket, y cualquier tabla que expongas directamente). Si no hay RLS, cualquiera con la key puede leer/escribir todo.
  2. **Rotar la key en Supabase** (Supabase Dashboard → Project Settings → API → Generate new anon key).
  3. **Mover la lógica de upload/download de archivos al backend Django.** El frontend no debe usar `supabase-js` directamente. El backend debe tener endpoints que reciban/archiven archivos y devuelvan URLs presignadas.
  4. Si eso es demasiado trabajo ahora, al menos quitar la `supabaseKey` del frontend y hacer que el backend devuelva las URLs públicas completas en los endpoints de libros/personajes (que ya lo hace parcialmente).
  5. **Actualizar `environment.prod.ts` para que no contenga la key.** Si se necesita para alguna feature menor, documentar el riesgo.
- **Verificación:** Hacer `curl` a Supabase Storage usando la key vieja. Debe devolver 401 o 403.

### 1.6 Agregar `vercel.json` para SPA routing
- **Archivo:** `Producto/frontend/vercel.json` (no existe)
- **Problema:** Vercel a veces maneja bien el SPA routing de Angular, pero si recarga una ruta profunda (`/book/xxx`), puede dar 404.
- **Acción:** Crear el archivo:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **Verificación:** Ir a `https://literatus-novelist.vercel.app/book/el-gato-negro-allan-poe-edgar` y recargar la página (F5). Debe seguir renderizando el libro, no un 404.

### 1.7 Agregar Content Security Policy (CSP) básica
- **Archivo:** `Producto/backend/config/settings.py` (agregar middleware o headers) o `Producto/frontend/src/index.html` (meta tag)
- **Problema:** Se cargan recursos de múltiples orígenes sin restricción: Google Fonts, Material Symbols, Supabase, Render, Lottie externo.
- **Acción mínima:** Agregar en `index.html` un meta tag CSP permisivo pero no anárquico:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://srbmswjsbkpftjabcurg.supabase.co; connect-src 'self' https://literatus-novelist-backend.onrender.com https://srbmswjsbkpftjabcurg.supabase.co;">
  ```
  Ajustar según los orígenes reales que el frontend use.
- **Verificación:** Abrir DevTools → Console. No deben aparecer CSP violations para recursos necesarios.

---

## 2. FUNCIONALIDAD BÁSICA DE PRODUCTO (Prioridad 2 — Bloqueante para usuarios reales)

### 2.1 Recuperación de contraseña
- **Archivos:** `Producto/frontend/src/app/auth/`, `Producto/backend/users/`
- **Problema:** No existe flujo de "Olvidé mi contraseña". Un usuario que pierda su password no puede recuperar la cuenta.
- **Acción:**
  1. Backend: Crear endpoint `POST /api/users/password-reset-request/` que reciba email, genere un token seguro (JWT de corta duración o signed token de Django), y envíe un email con un link de reset.
  2. Backend: Crear endpoint `POST /api/users/password-reset-confirm/` que reciba token + new password.
  3. Frontend: Crear componente `ForgotPasswordComponent` con formulario de email. Y un componente `ResetPasswordComponent` que lea el token de la URL.
  4. **Si no hay servicio de email configurado (SendGrid, AWS SES, etc.),** al menos guardar el token en la base de datos y mostrar un mensaje tipo "Contacta al administrador con este código: XXXX". No es ideal, pero es mejor que nada.
- **Verificación:** Registrar un usuario, usar "Olvidé contraseña", recibir el email (o ver el token en la base de datos), cambiar la contraseña, loguearse con la nueva.

### 2.2 Verificación de email en registro
- **Archivos:** `Producto/backend/users/`, `Producto/frontend/src/app/auth/register/`
- **Problema:** Cualquiera se registra con un email falso. No hay confirmación.
- **Acción:**
  1. Agregar campo `email_verified` al modelo de usuario (o usar `is_active` temporalmente).
  2. Al registrarse, enviar email con link de verificación.
  3. El usuario no puede interactuar con features que gasten Tinta hasta verificar el email (o al menos no puede comprar).
  4. Si no hay servicio de email, implementar un sistema de "código de verificación" que se genere y se muestre en pantalla (para demo) o use un servicio mock.
- **Verificación:** Registrar usuario, verificar que el email debe ser confirmado antes de hacer checkout.

### 2.3 SEO básico (Google no puede indexar los 1854 libros)
- **Archivos:** `Producto/frontend/src/app/app-routing.module.ts`, `Producto/frontend/src/app/catalog/book-detail-page/`, `Producto/frontend/src/app/catalog/author-detail-page/`, `Producto/frontend/src/app/characters/character-hub/`
- **Problema:** Angular SPA sin SSR/SSG. Google solo ve el HTML inicial con `<app-root></app-root>`. Los 1854 libros son invisibles para buscadores.
- **Acción mínima (sin SSR):**
  1. **Meta tags dinámicos por ruta:** Usar los servicios `Title` y `Meta` de Angular para inyectar `<title>` y `<meta name="description">` y `<meta property="og:*">` dinámicamente en cada página:
     - `/book/:slug` → `title = "{bookTitle} - {author} | Literatus Novelist"`, `description = {synopsis primeros 150 chars}`
     - `/author/:slug` → `title = "{authorName} | Literatus Novelist"`, `description = {bio primeros 150 chars}`
     - `/catalog` → `title = "Catálogo de libros | Literatus Novelist"`, `description = ...`
     - `/characters` → `title = "Personajes IA | Literatus Novelist"`
  2. **Generar `robots.txt` y `sitemap.xml` estáticos** en `src/assets/` y copiarlos al `dist/` en build. El sitemap debe listar las rutas principales: `/`, `/catalog`, `/characters`, `/authors`, `/categories`. Si es posible, generar dinámicamente las URLs de los ~50 libros más destacados.
  3. **Configurar preconnect y dns-prefetch** para los orígenes externos que ya se usan (ya tienes preconnect para Google Fonts, mantenerlo).
  4. **Lazy loading de imágenes** → ya tienes `loading="lazy"`. Verificar que funciona.
- **Verificación:**
  - Usar `curl` o `kimi_fetch_v2` para obtener el HTML de `/book/el-gato-negro-allan-poe-edgar`. El `<title>` debe contener el nombre del libro.
  - Verificar que `https://literatus-novelist.vercel.app/robots.txt` existe y permite indexación.
  - Verificar que `https://literatus-novelist.vercel.app/sitemap.xml` existe.

### 2.4 Fixear sinopsis vacías en los libros
- **Archivo:** Base de datos (via Django ORM o script)
- **Problema:** ~30% de los libros tienen `synopsis: ""`. Las tarjetas del catálogo se ven rotas o vacías.
- **Acción:**
  1. Crear un script Django (`python manage.py fix_empty_synopses`) que:
     - Encuentre todos los libros con `synopsis = ''` o `NULL`.
     - Si existe un backup de sinopsis (`synopses_backup.json` en el backend, que ya existe), buscar el match por título o slug y poblar.
     - Si no hay backup, generar un synopsis breve genérico usando el título y autor: `"{título} es una obra de {autor}. Explora este clásico de la literatura universal en Literatus Novelist."`
  2. Ejecutar el script y verificar que el contador de libros con sinopsis vacía llegue a cero.
- **Verificación:** API `catalog/books/` no debe retornar `synopsis: ""` para ningún libro.

### 2.5 Links fantasma en el footer
- **Archivo:** `Producto/frontend/src/app/core/components/footer/footer.component.html` (líneas 34-37, 45-47)
- **Problema:** Discord, Twitter, Instagram, Términos, Privacidad, Cookies apuntan a `#`.
- **Acción:**
  - Si no existen las páginas/socials: **quitar los links** temporalmente. Es mejor ausencia que link roto.
  - Si existen: reemplazar `#` por las URLs reales.
  - Crear páginas estáticas mínimas para Términos y Privacidad si no existen (pueden ser componentes simples en Angular con texto legal básico).
- **Verificación:** Ningún link del footer debe apuntar a `#`.

### 2.6 Stats de la home con datos reales (o quitarlos)
- **Archivo:** `Producto/frontend/src/app/home/home.component.ts` (líneas 236-255), `home.component.html`
- **Problema:** Los contadores animan a números arbitrarios (500, 2000, 50000, 100) que no se verifican. En el HTML original los `data-target` eran 12, 42, 350, 10.
- **Acción:**
  - **Opción A (preferida):** Hacer que el backend exponga un endpoint `GET /api/stats/` que devuelva:
    ```json
    { "books": 1854, "characters": <count real>, "conversations": <count real>, "authors": <count real> }
    ```
    El frontend debe consumir este endpoint y animar los contadores a los números reales.
  - **Opción B (si no hay tiempo):** Quitar la sección de stats completamente. Es mejor no tenerla que tener números falsos.
- **Verificación:** Los números en la home deben coincidir con `SELECT COUNT(*) FROM ...` en la base de datos.

### 2.7 Monetización real: al menos 5 libros de pago
- **Archivo:** Base de datos (Django admin o script)
- **Problema:** Todos los libros tienen `price: 0`. Tienes un checkout completo con Transbank y un sistema de "Tinta" pero no hay nada que comprar.
- **Acción:**
  1. Seleccionar 5-10 libros populares y ponerles `price` real (ej. 500, 1000, 1500 Tinta).
  2. En el frontend, las tarjetas de libros de pago deben mostrar el precio y un botón "Comprar" o "Adquirir".
  3. El flujo de checkout debe funcionar end-to-end: usuario sin libro → ve precio → compra con Tinta (o Webpay si no tiene Tinta) → libro aparece en Mi Biblioteca.
  4. **Si esto es para demo académico y no puede cobrar realmente:** usar el ambiente de integración de Transbank y poner un banner grande en el checkout que diga "Ambiente de prueba — Usa tarjeta de crédito de prueba: 4051885600446623, CVV 123, fecha futura".
- **Verificación:** Comprar un libro de pago con una cuenta de prueba. Verificar que:
  - Se descuenta Tinta correctamente (transacción atómica con `select_for_update`).
  - El libro aparece en `/library`.
  - No se puede comprar dos veces.
  - El checkout de Webpay funciona (si se usa Tinta insuficiente).

---

## 3. POLISH Y EXPERIENCIA DE USUARIO (Prioridad 3 — Diferenciador de producto)

### 3.1 Sistema de búsqueda global en el navbar
- **Archivo:** `Producto/frontend/src/app/app.component.html` (navbar)
- **Problema:** El buscador solo existe en `/catalog`. En la home no se puede buscar directamente.
- **Acción:** Agregar un input de búsqueda en el navbar (visible en desktop, quizás un icono que expande en mobile) que redirija a `/catalog?q=termino` o que abra un dropdown con resultados instantáneos (si el endpoint de búsqueda es rápido).
- **Verificación:** Escribir en el navbar, presionar Enter, debe ir al catálogo filtrado.

### 3.2 Reviews/ratings mínimos (prueba social)
- **Archivos:** Backend (`catalog` o nueva app `reviews`), Frontend (`book-detail-page`)
- **Problema:** 1854 libros sin estrellas, reviews, ni "más leídos esta semana". No hay indicador de calidad o popularidad.
- **Acción mínima:**
  - Agregar campos al modelo de Book: `avg_rating` (Decimal), `review_count` (Integer), `read_count` (Integer).
  - Mostrar estrellas en las tarjetas y en la página de detalle (aunque todas empiecen en 0 o en datos simulados de un script de seed).
  - Mostrar un badge "Más leído" o "Popular" en los libros con más `read_count`.
- **Verificación:** En la página de detalle de un libro, debe verse el rating y un contador de lecturas.

### 3.3 Analytics y error tracking
- **Archivo:** `Producto/frontend/src/app/core/services/`, `Producto/frontend/src/index.html`
- **Problema:** No hay forma de saber cuántos usuarios se registran, qué libros abren, o dónde falla la app.
- **Acción:**
  1. **Google Analytics 4** (gratuito): Agregar el script en `index.html` o usar la librería `@angular/google-tag-manager` (o simplemente el script gtag en el head). Trackear eventos clave: `sign_up`, `login`, `book_open`, `chapter_read`, `chat_start`, `ink_purchase`, `checkout_initiated`, `checkout_complete`.
  2. **Sentry** (plan gratuito): Instalar `@sentry/angular` para capturar errores de runtime automáticamente. Configurar el DSN via variable de entorno en el build (no hardcodear, pero para empezar se puede).
  3. **Backend:** Agregar logging estructurado para requests lentos y errores 500.
- **Verificación:**
  - En Google Analytics Realtime, debe aparecer al menos 1 visitante activo cuando se abre el sitio.
  - En Sentry, forzar un error en el frontend (ej. `throw new Error('test')` en consola) y verificar que aparece en el dashboard.

### 3.4 Página de error global (404/500 graceful)
- **Archivo:** `Producto/frontend/src/app/app-routing.module.ts`, nuevo componente `NotFoundComponent`
- **Problema:** La ruta `**` redirige a `''` (home). Si un libro no existe, el usuario no sabe qué pasó.
- **Acción:**
  1. Crear `NotFoundComponent` con diseño acorde al glassmorphism de la app.
  2. Cambiar la ruta `**` en `app-routing.module.ts`:
     ```typescript
     { path: '**', component: NotFoundComponent }
     ```
  3. En `BookDetailPageComponent`, si el libro no existe (API devuelve 404), mostrar el estado de "Libro no encontrado" en lugar de un spinner eterno.
  4. En el backend, si `DEBUG=False`, asegurar que los errores 500 devuelven JSON limpio para el frontend: `{ "error": "Internal server error" }`.
- **Verificación:** Visitar `/book/no-existe` debe mostrar una página de 404 diseñada, no redirigir a home.

### 3.5 Reducir bundle size (optimización de performance)
- **Archivo:** `Producto/frontend/src/app/app.module.ts`, `angular.json`
- **Problema:** El bundle incluye `phaser`, `onnxruntime-web`, `jspdf`, `lottie-web` en el chunk principal. El dashboard ya es lazy-loaded, pero hay más que optimizar.
- **Acción:**
  1. `onnxruntime-web` y el modelo Kokoro TTS: cargar lazy solo cuando se abre el panel de audio. No en el boot de la app.
  2. `jspdf` y `jspdf-autotable`: solo se usan en el dashboard (PDF export). Si el dashboard ya es lazy-loaded, verificar que no se carguen en el chunk principal. Si se importan en `app.module.ts` por algún servicio global, mover la importación al módulo del dashboard.
  3. `phaser`: no se usa según el git log ("chore: Remove obsolete Phaser code" pero puede estar en `package.json` todavía). Verificar si se usa. Si no, eliminar del `package.json`.
  4. `lottie-web`: se usa en home y reader. Considerar usar `ngx-lottie` con lazy loading o al menos asegurar que los JSON de Lottie se cargan on-demand.
  5. Verificar con `ng build --configuration=production` y analizar el `stats.json` (usar `webpack-bundle-analyzer` si es necesario). El objetivo es que el vendor chunk principal no exceda 500KB gzipped.
- **Verificación:** Correr `ng build` y revisar los tamaños de los chunks en `dist/frontend/stats.json` o `ng build --stats-json` + `webpack-bundle-analyzer`. El main.js debe ser < 500KB.

### 3.6 Fixear memory leaks en Home
- **Archivo:** `Producto/frontend/src/app/home/home.component.ts` (líneas 95-101, `initAutoScroll`, `ngOnDestroy`)
- **Problema:** `setInterval` se guarda en `scrollIntervals` pero `lottie.loadAnimation` en los `@ViewChild` setters puede crear múltiples instancias si Angular reconecta el elemento. Además, `initAutoScroll` usa `setInterval` sin cleanup si el componente se destruye antes de inicializarlos.
- **Acción:**
  1. Mover la carga de Lottie a `ngAfterViewInit` usando `ViewChild` estático (no setter) con `read: ElementRef`:
     ```typescript
     @ViewChild('readingContainer', { static: false }) readingContainer!: ElementRef;
     ```
  2. Guardar la referencia de la animación Lottie (`animation.destroy()` en `ngOnDestroy`).
  3. En `ngOnDestroy`, asegurar que se limpian TODOS los intervals, observers, y animaciones Lottie.
- **Verificación:** Navegar entre Home → Catalog → Home varias veces. En DevTools → Memory → Heap snapshot, las instancias de `HomeComponent` no deben acumularse.

### 3.7 README alineado con el código real
- **Archivo:** `README.md`
- **Problema:** Dice Angular 18+ pero el `package.json` tiene Angular 17.3.0.
- **Acción:** Corregir la versión en el README. También verificar que las instrucciones de instalación funcionan (`npm install`, `python -m venv .venv`, etc.).
- **Verificación:** El badge de Angular debe decir `^17.3.0` o simplemente `Angular 17+`.

---

## 4. VERIFICACIÓN FINAL INTEGRADA

Antes de dar por terminado este sprint, ejecutar esta checklist de verificación manual/automática:

### 4.1 Seguridad
- [ ] `DEBUG=False` en Render. Error 404 muestra página genérica, no debug.
- [ ] `ALLOWED_HOSTS` restringido. Petición con Host falso da 400.
- [ ] CORS solo permite Vercel y localhost. Petición desde `evil.com` bloqueada.
- [ ] Transbank apunta a producción (si es comercial) o tiene banner de "prueba" (si es integración).
- [ ] Supabase key rotada. RLS activado. Key vieja devuelve 401.
- [ ] `vercel.json` existe. Recarga en `/book/xxx` funciona.
- [ ] CSP no bloquea recursos legítimos. No hay violations en console.

### 4.2 Funcionalidad
- [ ] Usuario puede registrarse, loguearse, y usar "Olvidé contraseña".
- [ ] Email de verificación (o código) funciona.
- [ ] Meta tags dinámicos: `<title>` de `/book/xxx` contiene el nombre del libro.
- [ ] `robots.txt` y `sitemap.xml` accesibles en Vercel.
- [ ] Sinopsis vacías: `SELECT COUNT(*) FROM catalog_book WHERE synopsis = ''` = 0.
- [ ] Footer sin links a `#`.
- [ ] Stats en home: números reales o sección eliminada.
- [ ] Al menos 5 libros con `price > 0`. Flujo de compra end-to-end funciona.
- [ ] Página 404 existe para rutas no encontradas.

### 4.3 Performance y UX
- [ ] Main bundle < 500KB gzipped.
- [ ] Google Analytics trackea eventos clave.
- [ ] Sentry recibe errores de prueba.
- [ ] Búsqueda desde navbar funciona.
- [ ] Libros muestran rating/read count (aunque sea 0 inicialmente).
- [ ] Memory leaks en Home: no hay acumulación de componentes en heap snapshot.

---

## 5. NOTAS PARA EL AGENTE EJECUTOR

- **No romper el lector EPUB.** El lector (`reader.component`) es el feature más valioso. Cualquier cambio que lo toque debe ser testeado con un libro real (ej. El Gato Negro) para verificar que audio, chat, TOC, y themes siguen funcionando.
- **No romper el dashboard.** Si se toca algo del lazy-loaded dashboard, verificar que sigue cargando con `adminGuard`.
- **Commits atómicos:** Hacer un commit por cada punto de seguridad (ej. `fix(security): set DEBUG=False and restrict ALLOWED_HOSTS`). No mezclar todo en un solo commit.
- **Variables de entorno:** Documentar TODAS las variables que se necesitan en Render en un archivo `.env.example` actualizado si se agregan nuevas (ej. `SENTRY_DSN`, `GA_TRACKING_ID`, `DEBUG`, `ALLOWED_HOSTS`).
- **Deploy progresivo:** Hacer deploy al backend primero, verificar que funciona, luego hacer deploy al frontend. No deployear ambos a la vez sin testear.

---

## 6. RESUMEN EJECUTIVO PARA EL USUARIO

Este sprint de mejora prioriza **seguridad → funcionalidad básica → polish**. El objetivo es que Literatus pase de "proyecto académico impresionante" a "producto que puedes mostrarle a un usuario real sin que se ría de un link roto o le robe los datos de tarjeta". La experiencia del lector (el core del producto) ya está hecha y es sólida. Lo que falta es la "caja" alrededor: seguridad, SEO, recuperación de cuenta, y un flujo de monetización que demuestre que funciona.
