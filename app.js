"use strict";

// Límite de productos activos por vitrina. Mientras My Room sea gratis, todos tienen el mismo límite.
const PRODUCT_LIMIT = 5;
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
  new: "Vendedor nuevo"
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

let currentAd = null;

// Los anuncios se definen en ads-config.js. Se elige uno por visita y siempre se rotula como publicidad.
function pickAd() {
  const ads = (window.MYROOM_ADS || []).filter((ad) => ad && ad.active !== false && ad.title && /^https?:\/\//i.test(ad.url || ""));
  if (!ads.length) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

function renderAds() {
  const slot = el("adSlot");
  if (!slot) return;
  if (!currentAd) {
    slot.hidden = true;
    slot.innerHTML = "";
    return;
  }
  const ad = currentAd;
  slot.hidden = false;
  slot.innerHTML = `
    <a class="ad-card${ad.image ? " has-image" : ""}" href="${escapeAttribute(ad.url)}" target="_blank" rel="sponsored noopener noreferrer">
      <span class="ad-tag">Publicidad</span>
      ${ad.image ? `<img class="ad-image" src="${escapeAttribute(ad.image)}" alt="" loading="lazy">` : ""}
      <span class="ad-copy"><strong>${escapeHtml(ad.title)}</strong>${ad.text ? `<span>${escapeHtml(ad.text)}</span>` : ""}</span>
      <span class="ad-cta">${escapeHtml(ad.cta || "Ver más")}</span>
    </a>`;
}

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
      whatsapp: "",
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
    plan: "free"
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
    plan: "free"
  };

  if (!["clean", "retro", "colorful"].includes(normalized.profile.theme)) normalized.profile.theme = "clean";
  if (!["classic", "polaroid"].includes(normalized.profile.gridStyle)) normalized.profile.gridStyle = "classic";
  if (!backgroundPresets[normalized.profile.background]) normalized.profile.background = "soft";
  if (!stickerPacks[normalized.profile.stickerPack]) normalized.profile.stickerPack = "stars";
  if (!["rounded", "classic", "mono"].includes(normalized.profile.font)) normalized.profile.font = "rounded";
  if (!/^#[0-9a-f]{6}$/i.test(normalized.profile.accent || "")) normalized.profile.accent = defaults.profile.accent;
  if (!badgeLabels[normalized.profile.badge]) normalized.profile.badge = "active";

  if (!isTrustedMediaUrl(normalized.profile.avatar)) normalized.profile.avatar = createAvatarDataUrl();
  if (normalized.profile.cover && !isTrustedMediaUrl(normalized.profile.cover)) normalized.profile.cover = null;
  normalized.products.forEach((product) => {
    const safeImages = product.images.filter(isTrustedMediaUrl);
    product.images = safeImages.length ? safeImages : [createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□")];
  });
  return normalized;
}

function isTrustedMediaUrl(value) {
  if (typeof value !== "string") return false;
  if (value.startsWith("data:image/svg+xml;charset=UTF-8,")) return true;
  return value.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`);
}

function getBlankState(handle) {
  const demo = getDefaultState();
  return {
    version: demo.version,
    profile: {
      ...demo.profile,
      handle,
      storeName: "Mi vitrina",
      city: "",
      whatsapp: "",
      instagram: "",
      bio: "Estoy preparando mi vitrina.",
      avatar: createAvatarDataUrl(),
      cover: null,
      stickerPack: "none",
      badge: "new",
      memberSince: new Date().getFullYear(),
      markedSales: 0
    },
    products: [],
    plan: "free"
  };
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let currentSession = null;
let publicViewHandle = null;
let authMode = "signin";
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
  el("authAgeRow").hidden = !isSignUp;
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
  el("authBackButton").hidden = true;
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
  const btn = el(toggleId);
  if (!btn) return;
  btn.addEventListener("click", () => {
    const input = el(inputId);
    const willShow = input.type === "password";
    input.type = willShow ? "text" : "password";
    btn.textContent = willShow ? "Ocultar" : "Mostrar";
    btn.setAttribute("aria-label", willShow ? "Ocultar contraseña" : "Mostrar contraseña");
    btn.setAttribute("aria-pressed", String(willShow));
  });
}

async function signUpWithEmail(email, password) {
  if (!el("authAgeCheckbox").checked) {
    throw new Error("Debes declarar que eres mayor de 18 años para crear una cuenta.");
  }
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
        terms_version: "v2",
        age_confirmed_at: termsAcceptedAt
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

async function createVitrinaRow(userId, initialState, termsAcceptedAt = null, ageConfirmedAt = null) {
  const { error } = await supabaseClient.from("vitrinas").insert({
    user_id: userId,
    handle: initialState.profile.handle,
    state: initialState,
    terms_accepted_at: termsAcceptedAt,
    terms_version: termsAcceptedAt ? "v2" : null,
    age_confirmed_at: ageConfirmedAt
  });
  if (error) throw error;
}

async function initializeStorage() {
  publicViewHandle = getPublicHandleFromUrl();
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentSession = session;
  } catch (error) {
    console.warn("No se pudo leer la sesión", error);
    currentSession = null;
  }

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
    publicViewHandle = null;
  }

  if (isPasswordRecovery) return;

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
      state = getBlankState(`usuario-${currentSession.user.id.slice(0, 8)}`);
      const termsAcceptedAt = currentSession.user.user_metadata?.terms_accepted_at || new Date().toISOString();
      const ageConfirmedAt = currentSession.user.user_metadata?.age_confirmed_at || termsAcceptedAt;
      await createVitrinaRow(currentSession.user.id, state, termsAcceptedAt, ageConfirmedAt);
    }
    storageMode = "supabase";
    updateStorageStatus("Conectado", "ready");
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
  pill.hidden = mode === "ready";
  pill.classList.toggle("is-ready", mode === "ready");
  pill.classList.toggle("is-fallback", mode === "fallback");
}

function persistState() {
  saveQueue = saveQueue.then(async () => {
    if (storageMode === "supabase-public") return true;
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
      showToast(error?.code === "23505"
        ? "Ese nombre de usuario ya está en uso. Elige otro."
        : "No se pudo guardar en la nube. Revisa tu conexión.");
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
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function removeMediaByUrl(url) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = url?.indexOf(marker);
  if (idx === undefined || idx === -1 || !currentSession) return;
  const path = decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  if (!path.startsWith(`${currentSession.user.id}/`)) return;
  try {
    await supabaseClient.storage.from(MEDIA_BUCKET).remove([path]);
  } catch (error) {
    console.warn("No se pudo eliminar la foto anterior", error);
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
  let digits = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`;
  return digits.slice(0, 15);
}

function normalizeInstagram(value) {
  return String(value || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
}

function getPlanLimit() {
  return PRODUCT_LIMIT;
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
  const convert = (ch) => ch <= 0.03928 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4;
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
  renderAds();
  updateTopBarButtons();
}

function updateTopBarButtons() {
  const isOwner = storageMode === "supabase" && currentSession;
  const isPublicView = storageMode === "supabase-public";
  
  el("signOutButton").hidden = !isOwner;
  el("loginPromptButton").hidden = isOwner || !isPublicView;
  el("toggleEditorButton").hidden = !isOwner;
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
  el("publicCity").hidden = !profile.city;
  el("publicMemberSince").textContent = `🕘 Desde ${profile.memberSince}`;
  const soldCount = state.products.filter((product) => product.status === "sold").length;
  el("publicSalesCount").textContent = `✓ ${soldCount} ${soldCount === 1 ? "venta marcada" : "ventas marcadas"}`;
  el("publicSalesCount").hidden = soldCount === 0;
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
  el("platformBranding").textContent = "Creado con My Room · versión beta";
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
        <img class="product-image" src="${escapeAttribute(mediaUrl(product.images[0]))}" alt="${escapeAttribute(product.name)}" loading="lazy">
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
      <img src="${escapeAttribute(mediaUrl(product.images[0]))}" alt="" loading="lazy">
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
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= state.products.length) return;
  const temp = state.products[index];
  state.products[index] = state.products[targetIndex];
  state.products[targetIndex] = temp;
  renderProducts();
  renderEditorProducts();
  await persistState();
}

function renderStats() {
  const activeCount = getActiveProductCount();
  const limit = getPlanLimit();
  const soldCount = state.products.filter((p) => p.status === "sold").length;

  el("activeProductsStat").textContent = activeCount;
  el("productLimitText").textContent = `de ${limit} productos activos`;
  el("soldProductsStat").textContent = soldCount;
  el("planProductCount").textContent = activeCount;
  el("planProductLimit").textContent = limit;

  const pct = Math.min(100, Math.round((activeCount / limit) * 100));
  el("planProgress").style.width = `${pct}%`;
}

function updateBioCounter() {
  el("bioCounter").textContent = el("bioInput").value.length;
}

function openProductDetail(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const container = el("productDialogContent");
  const phone = normalizePhone(state.profile.whatsapp);
  const whatsappUrl = phone.length >= 8
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, vi en tu vitrina "${state.profile.storeName}" el producto "${product.name}" (${formatPrice(product.price)}). ¿Sigue disponible?`)}`
    : "#";

  container.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-gallery">
        <div class="product-gallery-main">
          <img id="detailMainImage" src="${escapeAttribute(mediaUrl(product.images[0]))}" alt="${escapeAttribute(product.name)}">
        </div>
        ${product.images.length > 1 ? `
          <div class="product-thumbnails">
            ${product.images.map((img, i) => `
              <button class="product-thumbnail ${i === 0 ? "is-active" : ""}" type="button">
                <img src="${escapeAttribute(mediaUrl(img))}" alt="">
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <div class="product-detail-copy">
        <span class="product-status ${escapeAttribute(product.status)}">${escapeHtml(statusLabels[product.status])}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p class="product-detail-price">${formatPrice(product.price)}</p>
        <p class="product-detail-description">${escapeHtml(product.description)}</p>
        <div class="product-detail-meta">
          <div><strong>Condición:</strong> ${escapeHtml(conditionLabels[product.condition])}</div>
          <div><strong>Categoría:</strong> ${escapeHtml(categoryLabels[product.category])}</div>
          <div><strong>Ubicación:</strong> ${escapeHtml(product.location || state.profile.city)}</div>
          <div><strong>Entrega:</strong> ${escapeHtml(product.delivery)}</div>
        </div>
        <div class="product-detail-actions">
          ${phone.length >= 8 ? `
            <a class="button button-accent" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
          ` : `
            <p><strong>Red social:</strong> @${escapeHtml(normalizeInstagram(state.profile.instagram))}</p>
          `}
          <button class="icon-button" id="shareProductButton" type="button" aria-label="Compartir producto">↗</button>
        </div>
      </div>
    </div>
  `;

  const thumbnails = container.querySelectorAll(".product-thumbnail");
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener("click", () => {
      thumbnails.forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
      el("detailMainImage").src = mediaUrl(product.images[index]);
    });
  });

  const shareBtn = container.querySelector("#shareProductButton");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => copyToClipboard(conceptualProductUrl(product.id), "Enlace al producto copiado."));
  }

  productDialog.showModal();
}

function openProductForm(productId = null) {
  const isEdit = Boolean(productId);
  const product = isEdit ? state.products.find((p) => p.id === productId) : null;

  el("productIdInput").value = productId || "";
  el("productFormTitle").textContent = isEdit ? "Editar producto" : "Agregar producto";
  el("productNameInput").value = product ? product.name : "";
  el("productPriceInput").value = product ? product.price : "";
  el("productCategoryInput").value = product ? product.category : "home";
  el("productConditionInput").value = product ? product.condition : "used";
  el("productStatusInput").value = product ? product.status : "available";
  el("productLocationInput").value = product ? product.location : state.profile.city;
  el("productDeliveryInput").value = product ? product.delivery : "";
  el("productDescriptionInput").value = product ? product.description : "";
  el("deleteProductButton").hidden = !isEdit;

  editingImages = product ? [...product.images] : [];
  renderImagePreviews();

  productFormDialog.showModal();
}

function renderImagePreviews() {
  const list = el("imagePreviewList");
  list.innerHTML = "";
  editingImages.forEach((img, index) => {
    const wrap = document.createElement("div");
    wrap.className = "image-preview";
    wrap.innerHTML = `
      <img src="${escapeAttribute(mediaUrl(img))}" alt="">
      <button type="button" aria-label="Eliminar foto">×</button>
    `;
    wrap.querySelector("button").addEventListener("click", () => {
      editingImages.splice(index, 1);
      renderImagePreviews();
    });
    list.appendChild(wrap);
  });
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage || "Copiado al portapapeles.");
  } catch (err) {
    showToast("No se pudo copiar automáticamente.");
  }
}

// Inicialización general y manejadores de eventos al cargar el documento
document.addEventListener("DOMContentLoaded", async () => {
  currentAd = pickAd();

  setupPasswordToggle("authPasswordToggle", "authPassword");
  setupPasswordToggle("authNewPasswordToggle", "authNewPassword");

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") showRecoveryForm();
    });
  }

  await initializeStorage();
  renderAll();

  // Cambios de pestañas en el editor
  document.querySelectorAll("[data-editor-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-editor-tab]").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll("[data-editor-panel]").forEach((p) => p.hidden = true);
      btn.classList.add("is-active");
      const target = btn.dataset.editorTab;
      const panel = document.querySelector(`[data-editor-panel="${target}"]`);
      if (panel) panel.hidden = false;
    });
  });

  // Filtros de productos en la vitrina pública
  document.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.dataset.filter;
      renderProducts();
    });
  });

  // Eventos para personalizar apariencia
  el("themePicker").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-theme-option]");
    if (!btn) return;
    state.profile.theme = btn.dataset.themeOption;
    renderAppearance();
    renderAppearanceControls();
    await persistState();
  });

  el("gridStylePicker").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-grid-option]");
    if (!btn) return;
    state.profile.gridStyle = btn.dataset.gridOption;
    renderAppearance();
    renderAppearanceControls();
    await persistState();
  });

  el("backgroundPicker").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-background-option]");
    if (!btn) return;
    state.profile.background = btn.dataset.backgroundOption;
    renderAppearance();
    renderAppearanceControls();
    await persistState();
  });

  el("accentColorInput").addEventListener("input", (e) => {
    state.profile.accent = e.target.value;
    renderAppearance();
  });

  el("accentColorInput").addEventListener("change", async () => {
    await persistState();
  });

  el("fontInput").addEventListener("change", async (e) => {
    state.profile.font = e.target.value;
    renderAppearance();
    await persistState();
  });

  el("stickerPackInput").addEventListener("change", async (e) => {
    state.profile.stickerPack = e.target.value;
    renderAppearance();
    await persistState();
  });

  el("productsTitleInput").addEventListener("input", (e) => {
    state.profile.productsTitle = e.target.value;
    el("productsTitle").textContent = e.target.value || "Cosas que estoy vendiendo";
  });

  el("productsTitleInput").addEventListener("change", async () => {
    await persistState();
  });

  // Formulario de edición de perfil
  el("bioInput").addEventListener("input", updateBioCounter);

  el("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    state.profile.handle = el("handleInput").value.trim().toLowerCase();
    state.profile.storeName = el("storeNameInput").value.trim();
    state.profile.city = el("cityInput").value.trim();
    state.profile.whatsapp = el("whatsappInput").value.trim();
    state.profile.instagram = el("instagramInput").value.trim();
    state.profile.badge = el("badgeInput").value;
    state.profile.bio = el("bioInput").value.trim();
    state.profile.welcomeTitle = el("welcomeTitleInput").value.trim();
    state.profile.welcomeText = el("welcomeTextInput").value.trim();

    renderProfile();
    const saved = await persistState();
    if (saved) showToast("Perfil actualizado correctamente.");
  });

  // Modal de productos
  el("addProductButton").addEventListener("click", () => {
    if (getActiveProductCount() >= getPlanLimit()) {
      showToast(`Llegaste al límite de ${getPlanLimit()} productos activos.`);
      return;
    }
    openProductForm();
  });

  el("closeProductDialogButton").addEventListener("click", () => productDialog.close());
  el("closeProductFormButton").addEventListener("click", () => productFormDialog.close());

  el("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = el("productIdInput").value;
    const name = el("productNameInput").value.trim();
    const price = Number(el("productPriceInput").value);
    const category = el("productCategoryInput").value;
    const condition = el("productConditionInput").value;
    const status = el("productStatusInput").value;
    const location = el("productLocationInput").value.trim();
    const delivery = el("productDeliveryInput").value.trim();
    const description = el("productDescriptionInput").value.trim();

    if (status !== "sold" && getActiveProductCount(id) >= getPlanLimit()) {
      showToast(`No puedes tener más de ${getPlanLimit()} productos activos.`);
      return;
    }

    if (id) {
      const idx = state.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        state.products[idx] = {
          ...state.products[idx],
          name, price, category, condition, status, location, delivery, description,
          images: editingImages.length ? editingImages : state.products[idx].images
        };
      }
    } else {
      state.products.unshift({
        id: generateId(),
        name, price, category, condition, status, location, delivery, description,
        images: editingImages.length ? editingImages : [createSvgDataUrl("SIN FOTO", "#d7d3ca", "#aaa39a", "□")],
        createdAt: new Date().toISOString()
      });
    }

    productFormDialog.close();
    renderProducts();
    renderEditorProducts();
    renderStats();
    await persistState();
    showToast(id ? "Producto actualizado." : "Producto agregado.");
  });

  el("deleteProductButton").addEventListener("click", async () => {
    const id = el("productIdInput").value;
    if (!id) return;
    state.products = state.products.filter((p) => p.id !== id);
    productFormDialog.close();
    renderProducts();
    renderEditorProducts();
    renderStats();
    await persistState();
    showToast("Producto eliminado.");
  });

  // Acciones de la barra superior
  el("toggleEditorButton").addEventListener("click", () => {
    const showingEditor = editorView.hidden;
    editorView.hidden = !showingEditor;
    storefrontView.hidden = showingEditor;
    el("toggleEditorButton").textContent = showingEditor ? "Ver mi vitrina pública" : "Editar mi vitrina";
  });

  el("previewButton").addEventListener("click", () => {
    editorView.hidden = true;
    storefrontView.hidden = false;
    el("toggleEditorButton").textContent = "Editar mi vitrina";
  });

  el("shareButton").addEventListener("click", () => {
    copyToClipboard(conceptualProfileUrl(), "Enlace de tu vitrina copiado.");
  });

  el("copyProfileUrlButton").addEventListener("click", () => {
    copyToClipboard(conceptualProfileUrl(), "Enlace de tu vitrina copiado.");
  });

  el("signOutButton").addEventListener("click", signOut);

  el("authModeSignIn").addEventListener("click", () => setAuthMode("signin"));
  el("authModeSignUp").addEventListener("click", () => setAuthMode("signup"));

  el("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = el("authEmail").value.trim();
    const password = el("authPassword").value;
    el("authError").hidden = true;

    try {
      if (authMode === "signup") {
        await signUpWithEmail(email, password);
        showToast("Cuenta creada. Revisa tu correo para verificar tu cuenta.");
      } else {
        await signInWithEmail(email, password);
        window.location.reload();
      }
    } catch (error) {
      showAuthError(error);
    }
  });

  el("authForgotPasswordButton").addEventListener("click", async () => {
    const email = el("authEmail").value.trim();
    if (!email) {
      showAuthError({ message: "Ingresa tu correo para enviarte el enlace de recuperación." });
      return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });
    if (error) showAuthError(error);
    else showToast("Te enviamos un correo para restablecer tu contraseña.");
  });

  el("authSetNewPasswordButton").addEventListener("click", async () => {
    const newPassword = el("authNewPassword").value;
    if (newPassword.length < 6) {
      showAuthError({ message: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) {
      showAuthError(error);
    } else {
      showToast("Contraseña actualizada con éxito.");
      window.location.href = window.location.pathname;
    }
  });
});
