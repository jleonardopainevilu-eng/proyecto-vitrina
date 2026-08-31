"use strict";

const FREE_PRODUCT_LIMIT = 5;
const PLUS_PRODUCT_LIMIT = 50;
const MAX_PRODUCT_IMAGES = 5;
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;

const statusLabels = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido"
};

const conditionLabels = {
  new: "Nuevo",
  "like-new": "Casi nuevo",
  used: "Usado",
  repair: "Para reparar"
};

const categoryLabels = {
  home: "Hogar y muebles",
  technology: "Tecnología",
  clothing: "Ropa y accesorios",
  books: "Libros y pasatiempos",
  sports: "Deportes",
  other: "Otros"
};

const badgeLabels = {
  active: "Perfil activo",
  new: "Vendedor nuevo",
  verified: "Perfil verificado",
  plus: "Vendedor Plus"
};

const stickerPacks = {
  none: [],
  stars: ["★", "✦", "☆", "✶", "✷"],
  hearts: ["♥", "♡", "♥", "♡", "❤"],
  flowers: ["✿", "❀", "✾", "❁", "✽"],
  doodles: ["☺", "☁", "⚡", "☻", "☼"]
};

const backgroundPresets = {
  soft: "linear-gradient(135deg, #e8e5ff 0%, #f9ede4 55%, #dff4ef 100%)",
  grid: "linear-gradient(rgba(120,110,96,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,110,96,.18) 1px, transparent 1px), #f3eee4",
  stars: "radial-gradient(circle at 15% 20%, rgba(255,255,255,.95) 0 1px, transparent 2px), radial-gradient(circle at 72% 38%, rgba(255,255,255,.8) 0 1px, transparent 2px), radial-gradient(circle at 48% 78%, rgba(255,255,255,.8) 0 1px, transparent 2px), linear-gradient(135deg, #25203d, #412654 60%, #142c3a)",
  sunset: "linear-gradient(135deg, #ff7f9f 0%, #ffc45b 52%, #7666ff 100%)",
  night: "linear-gradient(135deg, #10192f 0%, #37204d 55%, #102b36 100%)"
};

const objectUrlCache = new WeakMap();
let storageMode = "memory";
let state = null;
let activeFilter = "all";
let editingImages = [];
let toastTimer = null;
let saveQueue = Promise.resolve();

const el = (id) => document.getElementById(id);
const storefrontView = el("storefrontView");
const editorView = el("editorView");
const productGrid = el("productGrid");
const editorProductList = el("editorProductList");
const productDialog = el("productDialog");
const productFormDialog = el("productFormDialog");
const productForm = el("productForm");
const onboardingDialog = el("onboardingDialog");

function createSvgDataUrl(title, colorA, colorB, symbol = "✦") {
  const safeTitle = String(title).slice(0, 26).replace(/[&<>"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${colorA}"/>
          <stop offset="1" stop-color="${colorB}"/>
        </linearGradient>
        <pattern id="p" width="70" height="70" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="9" r="3" fill="rgba(255,255,255,.28)"/>
        </pattern>
      </defs>
      <rect width="900" height="900" rx="36" fill="url(#g)"/>
      <rect width="900" height="900" rx="36" fill="url(#p)"/>
      <circle cx="450" cy="385" r="205" fill="rgba(255,255,255,.22)"/>
      <text x="450" y="465" text-anchor="middle" font-size="190" font-family="Arial, sans-serif" fill="white">${symbol}</text>
      <rect x="110" y="690" width="680" height="92" rx="46" fill="rgba(20,18,16,.7)"/>
      <text x="450" y="750" text-anchor="middle" font-size="38" font-weight="700" font-family="Arial, sans-serif" fill="white">${safeTitle}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createAvatarDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
      <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff8da1"/><stop offset="1" stop-color="#6b5cff"/></linearGradient></defs>
      <rect width="700" height="700" fill="url(#a)"/>
      <circle cx="350" cy="275" r="138" fill="#ffe1c8"/>
      <path d="M210 265c10-145 270-185 292 12-46-49-86-83-168-79-49 2-88 23-124 67z" fill="#3c2b31"/>
      <circle cx="305" cy="286" r="10" fill="#2b2526"/><circle cx="400" cy="286" r="10" fill="#2b2526"/>
      <path d="M314 340c22 24 52 31 78 0" fill="none" stroke="#b65f62" stroke-width="12" stroke-linecap="round"/>
      <path d="M103 700c16-183 111-269 247-269s231 86 247 269" fill="#fff6d4"/>
      <path d="M244 469l106 89 106-89" fill="none" stroke="#6b5cff" stroke-width="25" stroke-linejoin="round"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getDefaultState() {
  return {
    version: 3,
    profile: {
      handle: "cami",
      storeName: "La pieza de Cami",
      city: "Puerto Montt",
      whatsapp: "56912345678",
      instagram: "@cami",
      bio: "Ropa, libros y objetos con ganas de encontrar una nueva casa.",
      avatar: createAvatarDataUrl(),
      cover: null,
      theme: "clean",
      gridStyle: "classic",
      background: "soft",
      accent: "#6b5cff",
      font: "rounded",
      stickerPack: "stars",
      productsTitle: "Cosas que estoy vendiendo",
      welcomeTitle: "Bienvenido a mi rincón.",
      welcomeText: "Mira tranquilo, pregunta sin compromiso.",
      badge: "active",
      memberSince: 2026,
      markedSales: 12
    },
    products: [
      {
        id: "prod-camera",
        name: "Cámara instantánea",
        price: 38000,
        category: "technology",
        condition: "used",
        status: "available",
        location: "Centro, Puerto Montt",
        delivery: "Entrega coordinada en lugar público.",
        description: "Funciona bien y tiene marcas normales de uso. Incluye correa y estuche.",
        images: [
          createSvgDataUrl("CÁMARA", "#634cff", "#ff8d9e", "◉"),
          createSvgDataUrl("DETALLE", "#ffb052", "#f55f82", "✦")
        ],
        createdAt: "2026-07-18T12:00:00.000Z"
      },
      {
        id: "prod-jacket",
        name: "Chaqueta vintage",
        price: 15000,
        category: "clothing",
        condition: "like-new",
        status: "available",
        location: "Alerce",
        delivery: "Retiro coordinado o entrega en el centro.",
        description: "Talla M. La usé pocas veces y está limpia. Tiene un detalle pequeño en una manga.",
        images: [createSvgDataUrl("CHAQUETA", "#f7b45b", "#e96f74", "♢")],
        createdAt: "2026-07-17T12:00:00.000Z"
      },
      {
        id: "prod-books",
        name: "Lote de 5 libros",
        price: 9000,
        category: "books",
        condition: "used",
        status: "reserved",
        location: "Puerto Montt",
        delivery: "Entrega en el centro durante la tarde.",
        description: "Cinco libros juveniles en buen estado. Se venden juntos.",
        images: [createSvgDataUrl("LIBROS", "#3ba983", "#b6e56b", "▤")],
        createdAt: "2026-07-16T12:00:00.000Z"
      },
      {
        id: "prod-lamp",
        name: "Lámpara de escritorio",
        price: 12000,
        category: "home",
        condition: "used",
        status: "sold",
        location: "Valle Volcanes",
        delivery: "Producto vendido.",
        description: "Lámpara metálica, regulable y funcionando correctamente.",
        images: [createSvgDataUrl("LÁMPARA", "#334b68", "#f0c35c", "☼")],
        createdAt: "2026-07-15T12:00:00.000Z"
      }
    ],
    plan: "free",
    visits: 128,
    contactClicks: 34
  };
}

function normalizeState(candidate) {
  const defaults = getDefaultState();
  if (!candidate || typeof candidate !== "object") return defaults;

  const normalized = {
    ...defaults,
    ...candidate,
    profile: {
      ...defaults.profile,
      ...(candidate.profile || {})
    },
    products: Array.isArray(candidate.products) ? candidate.products.map((product, index) => ({
      id: product.id || generateId(),
      name: product.name || `Producto ${index + 1}`,
      price: Number(product.price) || 0,
      category: product.category || "other",
      condition: product.condition || "used",
      status: product.status || "available",
      location: product.location || candidate.profile?.city || defaults.profile.city,
      delivery: product.delivery || "Entrega a coordinar con el vendedor.",
      description: product.description || "Sin descripción.",
      images: Array.isArray(product.images) && product.images.length ? product.images.slice(0, MAX_PRODUCT_IMAGES) : [createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□")],
      createdAt: product.createdAt || new Date(Date.now() - index * 1000).toISOString()
    })) : defaults.products,
    plan: candidate.plan === "plus" ? "plus" : "free",
    visits: Number(candidate.visits) || defaults.visits,
    contactClicks: Number(candidate.contactClicks) || 0
  };

  if (!["clean", "retro", "colorful"].includes(normalized.profile.theme)) normalized.profile.theme = "clean";
  if (!["classic", "polaroid"].includes(normalized.profile.gridStyle)) normalized.profile.gridStyle = "classic";
  if (!backgroundPresets[normalized.profile.background]) normalized.profile.background = "soft";
  if (!stickerPacks[normalized.profile.stickerPack]) normalized.profile.stickerPack = "stars";
  if (!["rounded", "classic", "mono"].includes(normalized.profile.font)) normalized.profile.font = "rounded";
  if (!/^#[0-9a-f]{6}$/i.test(normalized.profile.accent || "")) normalized.profile.accent = defaults.profile.accent;
  if (!badgeLabels[normalized.profile.badge]) normalized.profile.badge = "active";
  return normalized;
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let currentSession = null;
let publicViewHandle = null; // si no es null, estamos viendo la vitrina pública de otro usuario (solo lectura)
let authMode = "signin"; // "signin" | "signup" | "recovery"
let isPasswordRecovery = false;

function getPublicHandleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("u");
}

function showAuthScreen(message) {
  el("authScreen").hidden = false;
  if (message) el("authMessage").textContent = message;
}

function hideAuthScreen() {
  el("authScreen").hidden = true;
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignUp = mode === "signup";
  el("authModeSignIn").classList.toggle("is-active", mode === "signin");
  el("authModeSignIn").setAttribute("aria-selected", String(mode === "signin"));
  el("authModeSignUp").classList.toggle("is-active", isSignUp);
  el("authModeSignUp").setAttribute("aria-selected", String(isSignUp));
  el("authTermsRow").hidden = !isSignUp;
  el("authForgotPasswordButton").hidden = isSignUp;
  el("authPassword").autocomplete = isSignUp ? "new-password" : "current-password";
  el("authSubmitButton").textContent = isSignUp ? "Crear cuenta" : "Iniciar sesión";
  el("authMessage").textContent = isSignUp
    ? "Crea tu cuenta para armar tu propia vitrina."
    : "Ingresa tu correo y contraseña para abrir tu vitrina.";
  el("authError").hidden = true;
}

function showRecoveryForm() {
  isPasswordRecovery = true;
  authMode = "recovery";
  el("authScreen").hidden = false;
  el("authModeToggle").hidden = true;
  el("authFieldsGroup").hidden = true;
  el("authRecoveryGroup").hidden = false;
  el("authMessage").textContent = "Escribe tu nueva contraseña para tu cuenta.";
  el("authError").hidden = true;
}

function translateAuthError(error) {
  const raw = error?.message || "";
  const rules = [
    [/invalid login credentials/i, "Correo o contraseña incorrectos."],
    [/user already registered/i, "Ya existe una cuenta con ese correo. Intenta iniciar sesión."],
    [/email not confirmed/i, "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."],
    [/password should be at least/i, "La contraseña debe tener al menos 6 caracteres."],
    [/unable to validate email address/i, "Ese correo no parece válido."],
    [/for security purposes|rate limit|too many requests/i, "Demasiados intentos. Espera un momento y vuelve a intentarlo."]
  ];
  const match = rules.find(([pattern]) => pattern.test(raw));
  return match ? match[1] : (raw || "Ocurrió un error. Intenta de nuevo.");
}

function showAuthError(error) {
  const box = el("authError");
  box.textContent = translateAuthError(error);
  box.hidden = false;
}

function setupPasswordToggle(toggleId, inputId) {
  el(toggleId).addEventListener("click", () => {
    const input = el(inputId);
    const willShow = input.type === "password";
    input.type = willShow ? "text" : "password";
    el(toggleId).textContent = willShow ? "Ocultar" : "Mostrar";
    el(toggleId).setAttribute("aria-label", willShow ? "Ocultar contraseña" : "Mostrar contraseña");
    el(toggleId).setAttribute("aria-pressed", String(willShow));
  });
}

async function signUpWithEmail(email, password) {
  if (!el("authTermsCheckbox").checked) {
    throw new Error("Debes aceptar los Términos y Condiciones para crear tu cuenta.");
  }
  const termsAcceptedAt = new Date().toISOString();
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        terms_accepted_at: termsAcceptedAt,
        terms_version: "v1"
      }
    }
  });
  if (error) throw error;
  return termsAcceptedAt;
}

async function signInWithEmail(email, password) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

async function fetchVitrinaByUserId(userId) {
  const { data, error } = await supabaseClient
    .from("vitrinas")
    .select("state, handle")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchVitrinaByHandle(handle) {
  const { data, error } = await supabaseClient
    .from("vitrinas")
    .select("state, handle")
    .eq("handle", handle)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createVitrinaRow(userId, initialState, termsAcceptedAt = null) {
  const { error } = await supabaseClient.from("vitrinas").insert({
    user_id: userId,
    handle: initialState.profile.handle,
    state: initialState,
    terms_accepted_at: termsAcceptedAt,
    terms_version: termsAcceptedAt ? "v1" : null
  });
  if (error) throw error;
}

async function initializeStorage() {
  // Modo vitrina pública: alguien entró con ?u=handle, no necesita cuenta.
  publicViewHandle = getPublicHandleFromUrl();
  if (publicViewHandle) {
    try {
      const row = await fetchVitrinaByHandle(publicViewHandle);
      if (row) {
        state = normalizeState(row.state);
        storageMode = "supabase-public";
        updateStorageStatus("Vitrina pública", "ready");
        return;
      }
    } catch (error) {
      console.warn("No se pudo cargar la vitrina pública", error);
    }
    // Si el handle no existe, seguimos al flujo normal de login.
    publicViewHandle = null;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentSession = session;

  if (isPasswordRecovery) {
    return; // se queda mostrando el formulario de nueva contraseña
  }

  if (!currentSession) {
    state = getDefaultState();
    storageMode = "demo";
    updateStorageStatus("Viendo un ejemplo", "fallback");
    return;
  }

  hideAuthScreen();
  try {
    const row = await fetchVitrinaByUserId(currentSession.user.id);
    if (row) {
      state = normalizeState(row.state);
    } else {
      state = getDefaultState();
      state.profile.handle = `usuario-${currentSession.user.id.slice(0, 8)}`;
      const termsAcceptedAt = currentSession.user.user_metadata?.terms_accepted_at || new Date().toISOString();
      await createVitrinaRow(currentSession.user.id, state, termsAcceptedAt);
    }
    storageMode = "supabase";
    updateStorageStatus("Conectado a Supabase", "ready");
  } catch (error) {
    console.warn("No se pudo conectar a Supabase; se usará memoria local", error);
    storageMode = "memory";
    state = getDefaultState();
    updateStorageStatus("Solo esta sesión (sin conexión)", "fallback");
  }
}

function updateStorageStatus(text, mode) {
  const pill = el("storagePill");
  el("storageText").textContent = text;
  pill.classList.toggle("is-ready", mode === "ready");
  pill.classList.toggle("is-fallback", mode === "fallback");
}

function persistState() {
  saveQueue = saveQueue.then(async () => {
    if (storageMode === "supabase-public") return true; // solo lectura, no se guarda nada
    if (storageMode !== "supabase" || !currentSession) return false;
    try {
      const { error } = await supabaseClient
        .from("vitrinas")
        .update({ state, handle: state.profile.handle, updated_at: new Date().toISOString() })
        .eq("user_id", currentSession.user.id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error al guardar en Supabase", error);
      showToast("No se pudo guardar en la nube. Revisa tu conexión.");
      return false;
    }
  });
  return saveQueue;
}

const MEDIA_BUCKET = "vitrina-media";

function extensionForBlob(blob) {
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "image/png") return "png";
  return "webp";
}

async function uploadMedia(blob, pathWithoutExtension) {
  const path = `${pathWithoutExtension}.${extensionForBlob(blob)}`;
  const { error } = await supabaseClient.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type || "image/webp" });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-busting: mismo nombre, contenido nuevo
}

async function removeMediaFile(pathWithoutExtension) {
  try {
    await Promise.all(
      ["webp", "jpg", "png"].map((ext) =>
        supabaseClient.storage.from(MEDIA_BUCKET).remove([`${pathWithoutExtension}.${ext}`])
      )
    );
  } catch (error) {
    console.warn("No se pudo eliminar el archivo de Storage", error);
  }
}

async function removeMediaFolder(prefix) {
  try {
    const { data: files, error } = await supabaseClient.storage.from(MEDIA_BUCKET).list(prefix);
    if (error || !files?.length) return;
    await supabaseClient.storage.from(MEDIA_BUCKET).remove(files.map((file) => `${prefix}/${file.name}`));
  } catch (error) {
    console.warn("No se pudo limpiar archivos de Storage", error);
  }
}

function mediaUrl(media) {
  if (!media) return createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□");
  if (typeof media === "string") return media;
  if (media instanceof Blob) {
    if (!objectUrlCache.has(media)) objectUrlCache.set(media, URL.createObjectURL(media));
    return objectUrlCache.get(media);
  }
  return createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

function normalizeInstagram(value) {
  return String(value || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
}

function getPlanLimit() {
  return state.plan === "plus" ? PLUS_PRODUCT_LIMIT : FREE_PRODUCT_LIMIT;
}

function getActiveProductCount(exceptId = null) {
  return state.products.filter((product) => product.id !== exceptId && product.status !== "sold").length;
}

function conceptualProfileUrl() {
  return `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(state.profile.handle)}`;
}

function conceptualProductUrl(productId) {
  return `${conceptualProfileUrl()}#producto=${encodeURIComponent(productId)}`;
}

function accentTextColor(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const convert = (channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
  return luminance > 0.54 ? "#171717" : "#ffffff";
}

function renderAll() {
  renderAppearance();
  renderProfile();
  renderProducts();
  renderProfileForm();
  renderAppearanceControls();
  renderEditorProducts();
  renderStats();
  renderPlan();
}

function renderAppearance() {
  const { profile } = state;
  document.body.dataset.theme = profile.theme;
  document.body.dataset.font = profile.font;
  document.documentElement.style.setProperty("--accent", profile.accent);
  document.documentElement.style.setProperty("--accent-ink", accentTextColor(profile.accent));
  document.documentElement.style.setProperty("--hero-bg", backgroundPresets[profile.background] || backgroundPresets.soft);
  document.documentElement.style.setProperty("--hero-cover", profile.cover ? `url("${mediaUrl(profile.cover)}")` : "none");
  productGrid.dataset.gridStyle = profile.gridStyle;
  el("profileHero").classList.toggle("has-cover", Boolean(profile.cover));
  renderStickers();
}

function renderStickers() {
  const layer = el("stickerLayer");
  layer.innerHTML = "";
  const pack = stickerPacks[state.profile.stickerPack] || [];
  pack.forEach((symbol) => {
    const sticker = document.createElement("span");
    sticker.className = "sticker";
    sticker.textContent = symbol;
    layer.appendChild(sticker);
  });
}

function renderProfile() {
  const { profile } = state;
  el("publicAvatar").src = mediaUrl(profile.avatar);
  el("publicAvatar").alt = `Foto de perfil de ${profile.storeName}`;
  el("publicHandle").textContent = `@${profile.handle}`;
  el("publicStoreName").textContent = profile.storeName;
  el("publicBio").textContent = profile.bio;
  el("publicCity").textContent = `📍 ${profile.city}`;
  el("publicMemberSince").textContent = `🕘 Desde ${profile.memberSince}`;
  el("publicSalesCount").textContent = `✓ ${profile.markedSales} ventas marcadas`;
  el("publicBadge").textContent = badgeLabels[profile.badge] || badgeLabels.active;
  el("publicWelcomeTitle").textContent = profile.welcomeTitle || "Bienvenido a mi rincón.";
  el("publicWelcomeText").textContent = profile.welcomeText || "Mira tranquilo, pregunta sin compromiso.";
  el("productsTitle").textContent = profile.productsTitle || "Cosas que estoy vendiendo";

  const instagram = normalizeInstagram(profile.instagram);
  const instagramLink = el("instagramLink");
  if (instagram) {
    instagramLink.href = `https://instagram.com/${encodeURIComponent(instagram)}`;
    instagramLink.hidden = false;
  } else {
    instagramLink.hidden = true;
  }

  const phone = normalizePhone(profile.whatsapp);
  const whatsappLink = el("whatsappLink");
  if (phone.length >= 8) {
    whatsappLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, vi tu vitrina ${profile.storeName}. ¿Podemos conversar?`)}`;
    whatsappLink.setAttribute("aria-disabled", "false");
    whatsappLink.classList.remove("is-disabled");
  } else {
    whatsappLink.href = "#";
    whatsappLink.setAttribute("aria-disabled", "true");
    whatsappLink.classList.add("is-disabled");
  }

  el("siteFooter").hidden = false;
  el("platformBranding").hidden = state.plan === "plus";
  el("platformBranding").textContent = "Creado con My Room · prototipo funcional";
}

function filteredProducts() {
  if (activeFilter === "all") return state.products;
  return state.products.filter((product) => product.status === activeFilter);
}

function renderProducts() {
  const products = filteredProducts();
  productGrid.innerHTML = "";
  el("emptyProducts").hidden = products.length !== 0;

  products.forEach((product) => {
    const article = document.createElement("article");
    article.className = "product-card";
    article.innerHTML = `
      <div class="product-image-wrap">
        <img class="product-image" src="${escapeAttribute(mediaUrl(product.images[0]))}" alt="${escapeAttribute(product.name)}">
        <span class="product-status ${escapeAttribute(product.status)}">${escapeHtml(statusLabels[product.status] || product.status)}</span>
      </div>
      <div class="product-copy">
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <p class="product-condition">${escapeHtml(conditionLabels[product.condition] || product.condition)}</p>
      </div>
      <button class="card-hit-area" type="button" aria-label="Ver ${escapeAttribute(product.name)}"></button>
    `;
    article.querySelector("button").addEventListener("click", () => openProductDetail(product.id));
    productGrid.appendChild(article);
  });
}

function renderProfileForm() {
  const { profile } = state;
  el("handleInput").value = profile.handle;
  el("storeNameInput").value = profile.storeName;
  el("cityInput").value = profile.city;
  el("whatsappInput").value = profile.whatsapp;
  el("instagramInput").value = profile.instagram;
  el("badgeInput").value = profile.badge;
  el("bioInput").value = profile.bio;
  el("welcomeTitleInput").value = profile.welcomeTitle;
  el("welcomeTextInput").value = profile.welcomeText;
  el("avatarPreview").src = mediaUrl(profile.avatar);
  const coverPreview = el("coverPreview");
  coverPreview.style.backgroundImage = profile.cover ? `url("${mediaUrl(profile.cover)}")` : backgroundPresets[profile.background];
  updateBioCounter();
}

function renderAppearanceControls() {
  const { profile } = state;
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.themeOption === profile.theme);
  });
  document.querySelectorAll("[data-grid-option]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.gridOption === profile.gridStyle);
  });
  document.querySelectorAll("[data-background-option]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.backgroundOption === profile.background);
  });
  el("accentColorInput").value = profile.accent;
  el("fontInput").value = profile.font;
  el("stickerPackInput").value = profile.stickerPack;
  el("productsTitleInput").value = profile.productsTitle;
}

function renderEditorProducts() {
  editorProductList.innerHTML = "";
  if (!state.products.length) {
    editorProductList.innerHTML = `<div class="empty-state"><span>📦</span><h3>Agrega tu primer producto</h3><p>Podrás editarlo, ordenarlo o cambiar su estado cuando quieras.</p></div>`;
    return;
  }

  state.products.forEach((product, index) => {
    const row = document.createElement("article");
    row.className = "editor-product-row";
    row.innerHTML = `
      <img src="${escapeAttribute(mediaUrl(product.images[0]))}" alt="">
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${formatPrice(product.price)} · ${escapeHtml(statusLabels[product.status])} · ${escapeHtml(categoryLabels[product.category])}</p>
      </div>
      <div class="row-actions">
        <button class="text-button move-up-button" type="button" aria-label="Mover ${escapeAttribute(product.name)} hacia arriba" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="text-button move-down-button" type="button" aria-label="Mover ${escapeAttribute(product.name)} hacia abajo" ${index === state.products.length - 1 ? "disabled" : ""}>↓</button>
        <button class="button button-ghost edit-product-button" type="button">Editar</button>
      </div>
    `;
    row.querySelector(".edit-product-button").addEventListener("click", () => openProductForm(product.id));
    row.querySelector(".move-up-button").addEventListener("click", () => moveProduct(index, -1));
    row.querySelector(".move-down-button").addEventListener("click", () => moveProduct(index, 1));
    editorProductList.appendChild(row);
  });
}

async function moveProduct(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.products.length) return;
  [state.products[index], state.products[target]] = [state.products[target], state.products[index]];
  await persistState();
  renderProducts();
  renderEditorProducts();
}

function renderStats() {
  const activeCount = getActiveProductCount();
  const soldCount = state.products.filter((product) => product.status === "sold").length;
  const limit = getPlanLimit();
  el("activeProductsStat").textContent = activeCount;
  el("soldProductsStat").textContent = soldCount;
  el("visitsStat").textContent = state.visits;
  el("contactClicksStat").textContent = state.contactClicks;
  el("productLimitText").textContent = `de ${limit} en plan ${state.plan === "plus" ? "Plus" : "Gratis"}`;
  el("planProductCount").textContent = activeCount;
  el("planProductLimit").textContent = limit;
  el("planProgress").style.width = `${Math.min(100, (activeCount / limit) * 100)}%`;
}

function renderPlan() {
  document.querySelectorAll("[data-plan-card]").forEach((card) => {
    card.classList.toggle("is-current", card.dataset.planCard === state.plan);
  });
  document.querySelectorAll("[data-plan-option]").forEach((button) => {
    const isCurrent = button.dataset.planOption === state.plan;
    button.disabled = isCurrent;
    button.textContent = isCurrent
      ? `Plan ${state.plan === "plus" ? "Plus" : "Gratis"} activo`
      : button.dataset.planOption === "plus" ? "Simular plan Plus" : "Usar plan Gratis";
  });
  el("planDescription").textContent = state.plan === "plus"
    ? "Estás probando el plan Plus. En el producto real, esta activación dependería de una suscripción."
    : "Estás probando el plan Gratis. La vitrina muestra la marca de la plataforma y permite hasta cinco productos activos.";
}

function switchEditorTab(tabName) {
  document.querySelectorAll("[data-editor-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.editorTab === tabName);
  });
  document.querySelectorAll("[data-editor-panel]").forEach((panel) => {
    const active = panel.dataset.editorPanel === tabName;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
}

function showEditor(tabName = "profile") {
  storefrontView.hidden = true;
  editorView.hidden = false;
  el("toggleEditorButton").hidden = true;
  el("shareButton").hidden = true;
  switchEditorTab(tabName);
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStorefront() {
  editorView.hidden = true;
  storefrontView.hidden = false;
  el("toggleEditorButton").hidden = false;
  el("shareButton").hidden = false;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveProfile(event) {
  event.preventDefault();
  const cleanHandle = el("handleInput").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!cleanHandle) {
    showToast("El nombre de usuario necesita letras o números.");
    return;
  }

  state.profile = {
    ...state.profile,
    handle: cleanHandle,
    storeName: el("storeNameInput").value.trim(),
    city: el("cityInput").value.trim(),
    whatsapp: normalizePhone(el("whatsappInput").value),
    instagram: normalizeInstagram(el("instagramInput").value),
    badge: el("badgeInput").value,
    bio: el("bioInput").value.trim(),
    welcomeTitle: el("welcomeTitleInput").value.trim() || "Bienvenido a mi rincón.",
    welcomeText: el("welcomeTextInput").value.trim() || "Mira tranquilo, pregunta sin compromiso."
  };
  await persistState();
  renderAll();
  showToast("Perfil guardado.");
}

async function handleMediaUpload(event, target, maxDimension, quality) {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    showToast("La imagen supera 15 MB. Elige una más liviana.");
    event.target.value = "";
    return;
  }

  try {
    const compressed = await compressImage(file, maxDimension, quality);
    const url = await uploadMedia(compressed, `${currentSession.user.id}/${target}`);
    state.profile[target] = url;
    await persistState();
    renderAll();
    showToast(target === "avatar" ? "Foto de perfil actualizada." : "Portada actualizada.");
  } catch (error) {
    console.error(error);
    showToast("No fue posible subir esa imagen. En iPhone, prueba exportarla como JPG.");
  } finally {
    event.target.value = "";
  }
}

async function removeAvatar() {
  state.profile.avatar = createAvatarDataUrl();
  await persistState();
  await removeMediaFile(`${currentSession.user.id}/avatar`);
  renderAll();
  showToast("Foto de perfil restablecida.");
}

async function removeCover() {
  state.profile.cover = null;
  await persistState();
  await removeMediaFile(`${currentSession.user.id}/cover`);
  renderAll();
  showToast("Portada eliminada.");
}

async function applyAppearanceChange(key, value) {
  state.profile[key] = value;
  await persistState();
  renderAppearance();
  renderProfile();
  renderAppearanceControls();
  renderPlan();
}

function openProductForm(productId = null) {
  const limit = getPlanLimit();
  if (!productId && getActiveProductCount() >= limit) {
    showToast(`Tu plan permite ${limit} productos activos.`);
    switchEditorTab("plan");
    return;
  }

  productForm.reset();
  el("productIdInput").value = productId || "";
  el("productFormTitle").textContent = productId ? "Editar producto" : "Agregar producto";
  el("deleteProductButton").hidden = !productId;

  if (productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    el("productNameInput").value = product.name;
    el("productPriceInput").value = product.price;
    el("productCategoryInput").value = product.category;
    el("productConditionInput").value = product.condition;
    el("productStatusInput").value = product.status;
    el("productLocationInput").value = product.location;
    el("productDeliveryInput").value = product.delivery;
    el("productDescriptionInput").value = product.description;
    editingImages = [...product.images];
  } else {
    el("productCategoryInput").value = "other";
    el("productConditionInput").value = "used";
    el("productStatusInput").value = "available";
    el("productLocationInput").value = state.profile.city;
    el("productDeliveryInput").value = "Entrega a coordinar con el vendedor.";
    editingImages = [];
  }

  renderImagePreviews();
  productFormDialog.showModal();
}

function closeProductForm() {
  productFormDialog.close();
  editingImages = [];
  el("productImagesInput").value = "";
}

async function handleProductImagesUpload(event) {
  const files = [...event.target.files];
  const availableSlots = MAX_PRODUCT_IMAGES - editingImages.length;
  if (availableSlots <= 0) {
    showToast(`Puedes usar hasta ${MAX_PRODUCT_IMAGES} fotografías.`);
    event.target.value = "";
    return;
  }

  const chosenFiles = files.slice(0, availableSlots);
  if (chosenFiles.some((file) => file.size > MAX_SOURCE_IMAGE_BYTES)) {
    showToast("Una fotografía supera 15 MB y no fue agregada.");
  }

  try {
    const validFiles = chosenFiles.filter((file) => file.size <= MAX_SOURCE_IMAGE_BYTES);
    const compressed = [];
    for (const file of validFiles) compressed.push(await compressImage(file, 1400, 0.78));
    editingImages.push(...compressed);
    renderImagePreviews();
    if (files.length > availableSlots) showToast(`Se agregaron solo ${availableSlots} fotografías.`);
  } catch (error) {
    console.error(error);
    showToast("No fue posible procesar una fotografía. Prueba con JPG o PNG.");
  } finally {
    event.target.value = "";
  }
}

function renderImagePreviews() {
  const container = el("imagePreviewList");
  container.innerHTML = "";
  editingImages.forEach((image, index) => {
    const preview = document.createElement("div");
    preview.className = "image-preview";
    preview.innerHTML = `<img src="${escapeAttribute(mediaUrl(image))}" alt="Vista previa ${index + 1}"><button type="button" aria-label="Quitar imagen ${index + 1}">×</button>`;
    preview.querySelector("button").addEventListener("click", () => {
      editingImages.splice(index, 1);
      renderImagePreviews();
    });
    container.appendChild(preview);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const productId = el("productIdInput").value || generateId();
  const existing = state.products.find((item) => item.id === productId);
  const nextStatus = el("productStatusInput").value;
  const limit = getPlanLimit();
  if (nextStatus !== "sold" && getActiveProductCount(productId) >= limit) {
    showToast(`Tu plan permite ${limit} productos activos.`);
    return;
  }

  let uploadedImages;
  try {
    uploadedImages = await Promise.all(
      editingImages.map((image, index) => (
        image instanceof Blob
          ? uploadMedia(image, `${currentSession.user.id}/products/${productId}/${index}`)
          : Promise.resolve(image)
      ))
    );
  } catch (error) {
    console.error(error);
    showToast("No se pudieron subir una o más fotos. Intenta de nuevo.");
    return;
  }

  const productData = {
    id: productId,
    name: el("productNameInput").value.trim(),
    price: Number(el("productPriceInput").value),
    category: el("productCategoryInput").value,
    condition: el("productConditionInput").value,
    status: nextStatus,
    location: el("productLocationInput").value.trim() || state.profile.city,
    delivery: el("productDeliveryInput").value.trim() || "Entrega a coordinar con el vendedor.",
    description: el("productDescriptionInput").value.trim(),
    images: uploadedImages.length ? uploadedImages : [createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□")],
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  if (existing) {
    const index = state.products.findIndex((item) => item.id === productId);
    state.products[index] = productData;
  } else {
    state.products.unshift(productData);
  }

  const saved = await persistState();
  if (saved === false) return;
  closeProductForm();
  renderAll();
  showToast(existing ? "Producto actualizado." : "Producto publicado en tu vitrina.");
}

async function deleteProduct() {
  const productId = el("productIdInput").value;
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const accepted = window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`);
  if (!accepted) return;
  state.products = state.products.filter((item) => item.id !== productId);
  await persistState();
  await removeMediaFolder(`${currentSession.user.id}/products/${productId}`);
  closeProductForm();
  renderAll();
  showToast("Producto eliminado.");
}

function openProductDetail(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const phone = normalizePhone(state.profile.whatsapp);
  const message = `Hola, vi “${product.name}” en tu vitrina. ¿Todavía está disponible?`;
  const whatsappUrl = phone.length >= 8 ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "#";
  const images = product.images.length ? product.images : [createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□")];

  el("productDialogContent").innerHTML = `
    <div class="product-detail-layout">
      <div>
        <div class="product-gallery-main"><img id="detailMainImage" src="${escapeAttribute(mediaUrl(images[0]))}" alt="${escapeAttribute(product.name)}"></div>
        <div class="product-thumbnails" id="detailThumbnails"></div>
      </div>
      <div class="product-detail-copy">
        <span class="product-status ${escapeAttribute(product.status)}">${escapeHtml(statusLabels[product.status])}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p class="product-detail-price">${formatPrice(product.price)}</p>
        <p class="product-detail-description">${escapeHtml(product.description)}</p>
        <div class="product-detail-meta">
          <span><strong>Condición:</strong> ${escapeHtml(conditionLabels[product.condition])}</span>
          <span><strong>Categoría:</strong> ${escapeHtml(categoryLabels[product.category])}</span>
          <span><strong>Ubicación:</strong> ${escapeHtml(product.location)}</span>
          <span><strong>Entrega:</strong> ${escapeHtml(product.delivery)}</span>
        </div>
        <div class="product-detail-actions">
          <a class="button button-accent" id="detailWhatsappButton" href="${escapeAttribute(whatsappUrl)}" target="_blank" rel="noopener noreferrer" ${phone.length < 8 ? "aria-disabled=\"true\"" : ""}>Consultar por WhatsApp</a>
          <button class="button button-ghost" id="shareProductButton" type="button">Compartir</button>
        </div>
        <p class="detail-safety">Coordina directamente con el vendedor. Revisa el producto antes de pagar y evita enviar anticipos.</p>
      </div>
    </div>
  `;

  const thumbnails = el("detailThumbnails");
  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.className = `product-thumbnail${index === 0 ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `<img src="${escapeAttribute(mediaUrl(image))}" alt="Vista ${index + 1} de ${escapeAttribute(product.name)}">`;
    button.addEventListener("click", () => {
      el("detailMainImage").src = mediaUrl(image);
      thumbnails.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
    thumbnails.appendChild(button);
  });

  const detailWhatsappButton = el("detailWhatsappButton");
  detailWhatsappButton.addEventListener("click", async (event) => {
    if (phone.length < 8) {
      event.preventDefault();
      showToast("Este vendedor todavía no configuró WhatsApp.");
      return;
    }
    state.contactClicks += 1;
    await persistState();
    renderStats();
  });

  el("shareProductButton").addEventListener("click", () => shareItem(product.name, conceptualProductUrl(product.id)));
  productDialog.showModal();
  history.replaceState(null, "", `#producto=${encodeURIComponent(product.id)}`);
}

function closeProductDetail() {
  productDialog.close();
  if (location.hash.startsWith("#producto=")) history.replaceState(null, "", "#vitrina");
}

async function shareItem(title, url) {
  const payload = { title, text: title, url };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  await copyText(url);
  showToast("Enlace copiado.");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function shareProfile() {
  await shareItem(state.profile.storeName, conceptualProfileUrl());
}

async function copyProfileUrl() {
  await copyText(conceptualProfileUrl());
  showToast(`Enlace copiado: proyectovitrina.cl/${state.profile.handle}`);
}

async function selectPlan(plan) {
  if (plan === "free" && getActiveProductCount() > FREE_PRODUCT_LIMIT) {
    showToast("Para volver al plan Gratis, primero deja como máximo cinco productos activos.");
    return;
  }
  state.plan = plan;
  if (plan === "plus" && state.profile.badge === "active") state.profile.badge = "plus";
  if (plan === "free" && state.profile.badge === "plus") state.profile.badge = "active";
  await persistState();
  renderAll();
  showToast(plan === "plus" ? "Plan Plus activado en modo demostración." : "Plan Gratis activado.");
}

function updateBioCounter() {
  el("bioCounter").textContent = el("bioInput").value.length;
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

async function compressImage(file, maxDimension, quality) {
  let source;
  try {
    if ("createImageBitmap" in window) source = await createImageBitmap(file);
  } catch (error) {
    console.warn("createImageBitmap no pudo procesar la imagen", error);
  }

  if (!source) source = await loadImageElement(file);
  const sourceWidth = source.width || source.naturalWidth;
  const sourceHeight = source.height || source.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new Error("Dimensiones inválidas");

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  if (source.close) source.close();

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob) blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob) throw new Error("El navegador no pudo comprimir la imagen");
  return blob;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Formato de imagen no compatible"));
    };
    image.src = url;
  });
}

async function createNewStore(event) {
  event.preventDefault();
  const handle = el("onboardingHandleInput").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!handle) {
    showToast("Elige un nombre de usuario válido.");
    return;
  }

  const defaults = getDefaultState();
  state = {
    ...defaults,
    profile: {
      ...defaults.profile,
      handle,
      storeName: `El espacio de ${el("onboardingNameInput").value.trim()}`,
      city: el("onboardingCityInput").value.trim(),
      whatsapp: normalizePhone(el("onboardingWhatsappInput").value),
      instagram: "",
      bio: "Estoy preparando mi vitrina personal.",
      badge: "new",
      markedSales: 0,
      theme: "clean",
      gridStyle: "classic",
      stickerPack: "none"
    },
    products: [],
    visits: 0,
    contactClicks: 0,
    plan: "free"
  };
  await persistState();
  onboardingDialog.close();
  renderAll();
  showEditor("profile");
  showToast("Tu vitrina fue creada. Ahora personalízala.");
}

async function resetDemo() {
  const accepted = window.confirm("¿Restablecer toda la demostración? Se eliminarán los cambios y fotografías guardadas en este navegador.");
  if (!accepted) return;
  state = getDefaultState();
  await persistState();
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "all"));
  renderAll();
  showStorefront();
  showToast("Demostración restablecida.");
}

function bindEvents() {
  el("authModeSignIn").addEventListener("click", () => setAuthMode("signin"));
  el("authModeSignUp").addEventListener("click", () => setAuthMode("signup"));

  el("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    el("authError").hidden = true;
    const email = el("authEmail").value.trim();
    const password = el("authPassword").value;
    const button = el("authSubmitButton");
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = authMode === "signup" ? "Creando cuenta…" : "Ingresando…";
    try {
      if (authMode === "signup") {
        await signUpWithEmail(email, password);
        el("authMessage").textContent = "Cuenta creada. Revisa tu correo si se pide confirmación, o inicia sesión.";
      } else {
        await signInWithEmail(email, password);
        window.location.reload();
        return;
      }
    } catch (error) {
      showAuthError(error);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });

  el("authForgotPasswordButton").addEventListener("click", async () => {
    el("authError").hidden = true;
    const email = el("authEmail").value.trim();
    if (!email) {
      showAuthError(new Error("Escribe tu correo arriba y luego toca este enlace."));
      return;
    }
    const button = el("authForgotPasswordButton");
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Enviando…";
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      el("authMessage").textContent = "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.";
    } catch (error) {
      showAuthError(error);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });

  el("authSetNewPasswordButton").addEventListener("click", async () => {
    el("authError").hidden = true;
    const newPassword = el("authNewPassword").value;
    if (newPassword.length < 6) {
      showAuthError(new Error("La contraseña debe tener al menos 6 caracteres."));
      return;
    }
    const button = el("authSetNewPasswordButton");
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Guardando…";
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      isPasswordRecovery = false;
      window.location.href = window.location.origin + window.location.pathname;
    } catch (error) {
      showAuthError(error);
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });

  setupPasswordToggle("authPasswordToggle", "authPassword");
  setupPasswordToggle("authNewPasswordToggle", "authNewPassword");
  if (!isPasswordRecovery) {
    setAuthMode("signin");
  }

  el("signOutButton").addEventListener("click", signOut);

  el("toggleEditorButton").addEventListener("click", () => {
    if (!currentSession) {
      setAuthMode("signup");
      showAuthScreen();
      return;
    }
    showEditor("profile");
  });
  el("loginPromptButton").addEventListener("click", () => {
    setAuthMode("signin");
    showAuthScreen();
  });
  el("previewButton").addEventListener("click", showStorefront);
  el("brandButton").addEventListener("click", showStorefront);
  el("shareButton").addEventListener("click", shareProfile);
  el("shareProfileIconButton").addEventListener("click", shareProfile);
  el("copyProfileUrlButton").addEventListener("click", copyProfileUrl);
  el("createMineButton").addEventListener("click", () => onboardingDialog.showModal());
  el("closeOnboardingButton").addEventListener("click", () => onboardingDialog.close());
  el("onboardingForm").addEventListener("submit", createNewStore);
  el("profileForm").addEventListener("submit", saveProfile);
  el("bioInput").addEventListener("input", updateBioCounter);
  el("avatarInput").addEventListener("change", (event) => handleMediaUpload(event, "avatar", 700, 0.82));
  el("coverInput").addEventListener("change", (event) => handleMediaUpload(event, "cover", 1800, 0.78));
  el("removeAvatarButton").addEventListener("click", removeAvatar);
  el("removeCoverButton").addEventListener("click", removeCover);
  el("addProductButton").addEventListener("click", () => openProductForm());
  el("closeProductFormButton").addEventListener("click", closeProductForm);
  el("productImagesInput").addEventListener("change", handleProductImagesUpload);
  productForm.addEventListener("submit", saveProduct);
  el("deleteProductButton").addEventListener("click", deleteProduct);
  el("closeProductDialogButton").addEventListener("click", closeProductDetail);
  el("resetDemoButton").addEventListener("click", resetDemo);

  el("instagramLink").addEventListener("click", async () => {
    state.contactClicks += 1;
    await persistState();
    renderStats();
  });
  el("whatsappLink").addEventListener("click", async (event) => {
    if (normalizePhone(state.profile.whatsapp).length < 8) {
      event.preventDefault();
      showToast("Este vendedor todavía no configuró WhatsApp.");
      return;
    }
    state.contactClicks += 1;
    await persistState();
    renderStats();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderProducts();
    });
  });

  document.querySelectorAll("[data-editor-tab]").forEach((button) => {
    button.addEventListener("click", () => switchEditorTab(button.dataset.editorTab));
  });

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => applyAppearanceChange("theme", button.dataset.themeOption));
  });
  document.querySelectorAll("[data-grid-option]").forEach((button) => {
    button.addEventListener("click", () => applyAppearanceChange("gridStyle", button.dataset.gridOption));
  });
  document.querySelectorAll("[data-background-option]").forEach((button) => {
    button.addEventListener("click", () => applyAppearanceChange("background", button.dataset.backgroundOption));
  });
  el("accentColorInput").addEventListener("input", (event) => applyAppearanceChange("accent", event.target.value));
  el("fontInput").addEventListener("change", (event) => applyAppearanceChange("font", event.target.value));
  el("stickerPackInput").addEventListener("change", (event) => applyAppearanceChange("stickerPack", event.target.value));
  el("productsTitleInput").addEventListener("change", (event) => applyAppearanceChange("productsTitle", event.target.value.trim() || "Cosas que estoy vendiendo"));

  document.querySelectorAll("[data-plan-option]").forEach((button) => {
    button.addEventListener("click", () => selectPlan(button.dataset.planOption));
  });

  [productDialog, productFormDialog, onboardingDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  productDialog.addEventListener("close", () => {
    if (location.hash.startsWith("#producto=")) history.replaceState(null, "", "#vitrina");
  });

  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#producto=")) {
      const id = decodeURIComponent(location.hash.slice("#producto=".length));
      if (!productDialog.open) openProductDetail(id);
    }
  });
}

async function init() {
  await initializeStorage();
  bindEvents();

  if (isPasswordRecovery) {
    // La pantalla de recuperación ya está mostrándose; no hay nada más que preparar.
    return;
  }

  if (publicViewHandle) {
    // Vitrina pública de otro usuario: solo lectura, sin editor ni botón de sesión.
    el("toggleEditorButton").hidden = true;
    el("shareButton").hidden = true;
    el("signOutButton").hidden = true;
    el("loginPromptButton").hidden = true;
  } else if (currentSession) {
    el("signOutButton").hidden = false;
    el("loginPromptButton").hidden = true;
    el("toggleEditorButton").hidden = false;
    el("toggleEditorButton").textContent = "Editar mi vitrina";
    el("shareButton").hidden = false;
  } else {
    // Modo ejemplo: visitante sin cuenta viendo una vitrina de muestra.
    el("signOutButton").hidden = true;
    el("shareButton").hidden = true;
    el("loginPromptButton").hidden = false;
    el("toggleEditorButton").hidden = false;
    el("toggleEditorButton").textContent = "Crear mi vitrina gratis";
  }

  renderAll();
  state.visits += 1;
  await persistState();
  renderStats();

  if (location.hash.startsWith("#producto=")) {
    const id = decodeURIComponent(location.hash.slice("#producto=".length));
    requestAnimationFrame(() => openProductDetail(id));
  }
}

try {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      showRecoveryForm();
    }
  });
} catch (error) {
  console.warn("No se pudo registrar el listener de sesión", error);
}

document.addEventListener("DOMContentLoaded", init);
