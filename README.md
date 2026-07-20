# Proyecto Vitrina — prototipo completo

Prototipo navegable de una plataforma donde cada persona crea una vitrina visual propia para vender artículos que ya no usa y compartirla mediante un enlace en la biografía de Instagram.

El nombre **Proyecto Vitrina** es provisional. La marca definitiva puede definirse después.

## Concepto del producto

Cada usuario obtiene una página independiente, por ejemplo:

```text
proyectovitrina.cl/cami
```

El visitante entra directamente al espacio del vendedor. No necesita pasar primero por un marketplace general. La plataforma facilita la exhibición y el contacto; comprador y vendedor coordinan directamente el pago y la entrega.

## Incluido en esta entrega

### Vitrina pública

- Perfil con foto, portada, nombre, usuario, ciudad, biografía e insignia.
- Botones de Instagram, WhatsApp y compartir.
- Mensaje de bienvenida configurable.
- Cuadrícula de productos adaptable a teléfono y computador.
- Filtros por disponible, reservado y vendido.
- Ficha individual con galería de hasta cinco imágenes.
- Información de condición, categoría, ubicación y entrega.
- Mensaje de WhatsApp prellenado.
- Avisos de seguridad visibles.
- Botón viral **Crear mi vitrina gratis**.

### Personalización

- Temas **Limpio**, **Retro** y **Colorido**.
- Cuadrícula **Clásica** o **Polaroid**.
- Cinco fondos predefinidos.
- Imagen de portada propia.
- Color principal configurable.
- Tipografía redondeada, clásica o monoespaciada.
- Packs de stickers: estrellas, corazones, flores y doodles.
- Título de productos y mensaje de bienvenida editables.
- Sin música ni archivos de audio.

### Productos

- Hasta cinco fotografías por producto.
- Compresión automática antes de guardar.
- Precio, categoría, condición, estado, ubicación, entrega y descripción.
- Edición y eliminación.
- Orden manual mediante botones para subir o bajar productos.
- Estados: disponible, reservado y vendido.

### Planes simulados

- Gratis: hasta 5 productos activos.
- Plus: hasta 50 productos activos.
- Precio de referencia Plus: $3.990 CLP al mes.
- Cambio de plan disponible solo para demostrar la experiencia; no procesa pagos.

### Almacenamiento local

El prototipo usa **IndexedDB** como primera opción. Puede guardar objetos `Blob`, por lo que evita convertir fotografías a Base64 y es más apropiado para imágenes que `localStorage`.

Si IndexedDB no está disponible, utiliza un respaldo local. Esta solución es únicamente para el prototipo: las vitrinas todavía no se sincronizan entre dispositivos ni se publican realmente en internet.

## Cómo ejecutarlo

### Método rápido

Abre `index.html` en un navegador moderno.

### Método recomendado

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8080
```

Luego abre:

```text
http://localhost:8080
```

Usar un servidor local ofrece un comportamiento más consistente para IndexedDB, portapapeles y enlaces.

## Archivos

```text
index.html   Estructura de las pantallas y formularios
styles.css   Diseño responsive, temas y cuadrículas
app.js       Estado, IndexedDB, productos y personalización
README.md    Documentación
```

## Qué falta para producción

La siguiente fase debe migrar la fuente principal de datos a la nube:

1. Autenticación de usuarios.
2. Supabase Database para perfiles, vitrinas y productos.
3. Supabase Storage para fotografías y portadas.
4. URLs públicas reales por nombre de usuario.
5. Panel administrativo y sistema de denuncias.
6. Reglas de seguridad a nivel de base de datos.
7. Suscripciones reales para el plan Plus.
8. Moderación de productos prohibidos.
9. Política de privacidad, términos y reglas de uso.

IndexedDB se mantendría como caché y almacenamiento de borradores, no como fuente definitiva.
