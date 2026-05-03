// ============================================================
// TALIX — Mock Data
// ============================================================

const TALIX_ITEMS = [
  { id:1, title:"Cálculo Integral – Larson 9ed", category:"Libros", user:"Ana M.", userId:2, avatar:"AM", avatarColor:"#6DBE7E", condition:"Buen estado", bgColor:"#E8F5E9", description:"Libro de Cálculo Integral, 9na edición de Larson. Poco uso, sin subrayados. Ideal para ingeniería.", co2:2.4, likes:14, posted:"hace 2h", want:"Química General o Física 1", faculty:"Ingeniería" },
  { id:2, title:"Mouse Logitech MX Master 3", category:"Tecnología", user:"Carlos R.", userId:3, avatar:"CR", avatarColor:"#5B9BD5", condition:"Como nuevo", bgColor:"#E3F2FD", description:"Mouse inalámbrico casi sin uso. Cargador incluido. Perfecto para diseño y trabajo en oficina.", co2:12.5, likes:22, posted:"hace 4h", want:"Teclado mecánico o auriculares", faculty:"Diseño" },
  { id:3, title:"Chaqueta deportiva USIL XL", category:"Ropa", user:"Lucía P.", userId:4, avatar:"LP", avatarColor:"#F5A623", condition:"Buen estado", bgColor:"#FFF3E0", description:"Chaqueta deportiva talla XL, color verde. Perfecta para días fríos. Lavada y sin manchas.", co2:5.0, likes:9, posted:"hace 6h", want:"Ropa casual o mochila", faculty:"Administración" },
  { id:4, title:"Webcam Logitech C920 HD", category:"Tecnología", user:"Diego F.", userId:5, avatar:"DF", avatarColor:"#9C6BBE", condition:"Buen estado", bgColor:"#F3E5F5", description:"Cámara web Full HD 1080p. Ideal para clases online. Funciona perfectamente.", co2:10.0, likes:17, posted:"hace 8h", want:"Micrófono o audífonos", faculty:"Comunicaciones" },
  { id:5, title:"Pack Libros Economía I + II", category:"Libros", user:"Valeria C.", userId:6, avatar:"VC", avatarColor:"#E57373", condition:"Regular", bgColor:"#FFEBEE", description:"Mankiw Principios de Economía y Microeconomía. Tienen algunos apuntes al margen, muy útiles.", co2:4.8, likes:11, posted:"hace 1d", want:"Libros de administración o marketing", faculty:"Economía" },
  { id:6, title:"Teclado mecánico Redragon K552", category:"Tecnología", user:"Marco T.", userId:7, avatar:"MT", avatarColor:"#4DB6AC", condition:"Buen estado", bgColor:"#E0F2F1", description:"Teclado mecánico TKL, switches rojos. RGB funcional. Sin keycaps faltantes.", co2:11.0, likes:19, posted:"hace 1d", want:"Mouse gaming o auriculares", faculty:"Ingeniería" },
  { id:7, title:"Celular Samsung A32 – 128GB", category:"Tecnología", user:"Sofía M.", userId:8, avatar:"SM", avatarColor:"#FF8A65", condition:"Buen estado", bgColor:"#FBE9E7", description:"Samsung Galaxy A32, 128GB, cámara 64MP. Con cargador original. Sin golpes.", co2:15.0, likes:31, posted:"hace 2d", want:"Laptop o tablet", faculty:"Psicología" },
  { id:8, title:"Mochila Samsonite 30L", category:"Accesorios", user:"Rodrigo B.", userId:9, avatar:"RB", avatarColor:"#78909C", condition:"Buen estado", bgColor:"#ECEFF1", description:"Mochila negra con compartimiento para laptop hasta 15.6'. En buen estado, cierre funciona.", co2:3.5, likes:8, posted:"hace 3d", want:"Libros o útiles de oficina", faculty:"Derecho" },
];

const TALIX_USERS = [
  { id:1, name:"Joel Santiago", swaps:23, co2:58.2, avatar:"JS", avatarColor:"#1A7A50", faculty:"Ingeniería Industrial", items:3, joined:"Enero 2025", me:true },
  { id:2, name:"Ana Martínez", swaps:18, co2:43.1, avatar:"AM", avatarColor:"#6DBE7E", faculty:"Ingeniería de Sistemas", items:5 },
  { id:3, name:"Carlos Ruiz", swaps:15, co2:38.7, avatar:"CR", avatarColor:"#5B9BD5", faculty:"Diseño Gráfico", items:4 },
  { id:4, name:"Lucía Peralta", swaps:12, co2:32.4, avatar:"LP", avatarColor:"#F5A623", faculty:"Administración", items:6 },
  { id:5, name:"Diego Flores", swaps:10, co2:28.0, avatar:"DF", avatarColor:"#9C6BBE", faculty:"Comunicaciones", items:2 },
  { id:6, name:"Valeria Cruz", swaps:8, co2:21.5, avatar:"VC", avatarColor:"#E57373", faculty:"Economía", items:3 },
  { id:7, name:"Marco Torres", swaps:7, co2:18.9, avatar:"MT", avatarColor:"#4DB6AC", faculty:"Ingeniería", items:2 },
];

const MOCK_CHAT = [
  { id:1, from:"other", text:"¡Hola! Vi que tienes el cálculo de Larson, me interesa mucho 📚", time:"10:24" },
  { id:2, from:"me", text:"Sí! Está en buen estado. ¿Qué me ofrecerías a cambio?", time:"10:26" },
  { id:3, from:"other", text:"Tengo Química General de Chang, también 9na edición. Está casi nuevo 😊", time:"10:27" },
  { id:4, from:"me", text:"Perfecto, justo lo que necesito! ¿Cuándo podemos hacer el trueque?", time:"10:30" },
  { id:5, from:"other", text:"Puedo el miércoles o viernes después de clases. ¿En la biblioteca?", time:"10:31" },
  { id:6, from:"me", text:"El miércoles a las 4pm en la biblioteca me va perfecto 👍", time:"10:33" },
  { id:7, from:"other", text:"¡Trato! Nos vemos ahí entonces. Gracias!", time:"10:34" },
];

const CATEGORIES = ["Todos", "Libros", "Tecnología", "Ropa", "Accesorios"];

const CO2_BY_CATEGORY = {
  "Libros": 2.4,
  "Tecnología": 12.5,
  "Ropa": 5.0,
  "Accesorios": 3.5,
};

// Expose globally
Object.assign(window, { TALIX_ITEMS, TALIX_USERS, MOCK_CHAT, CATEGORIES, CO2_BY_CATEGORY });
