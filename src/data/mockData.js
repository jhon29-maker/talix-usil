export const TALIX_ITEMS = [
  { id: '1', title: 'Cálculo Integral – Larson 9ed', category: 'Libros', user: 'Ana M.', userId: '2', avatar: 'AM', avatarColor: '#6DBE7E', condition: 'Buen estado', bgColor: '#E8F5E9', description: 'Libro de Cálculo Integral, 9na edición de Larson. Poco uso, sin subrayados. Ideal para ingeniería.', co2: 2.4, likes: [], posted: 'hace 2h', want: 'Química General o Física 1', faculty: 'Ingeniería' },
  { id: '2', title: 'Mouse Logitech MX Master 3', category: 'Tecnología', user: 'Carlos R.', userId: '3', avatar: 'CR', avatarColor: '#5B9BD5', condition: 'Como nuevo', bgColor: '#E3F2FD', description: 'Mouse inalámbrico casi sin uso. Cargador incluido. Perfecto para diseño y trabajo en oficina.', co2: 12.5, likes: [], posted: 'hace 4h', want: 'Teclado mecánico o auriculares', faculty: 'Diseño' },
  { id: '3', title: 'Chaqueta deportiva USIL XL', category: 'Ropa', user: 'Lucía P.', userId: '4', avatar: 'LP', avatarColor: '#F5A623', condition: 'Buen estado', bgColor: '#FFF3E0', description: 'Chaqueta deportiva talla XL, color verde. Perfecta para días fríos. Lavada y sin manchas.', co2: 5.0, likes: [], posted: 'hace 6h', want: 'Ropa casual o mochila', faculty: 'Administración' },
  { id: '4', title: 'Webcam Logitech C920 HD', category: 'Tecnología', user: 'Diego F.', userId: '5', avatar: 'DF', avatarColor: '#9C6BBE', condition: 'Buen estado', bgColor: '#F3E5F5', description: 'Cámara web Full HD 1080p. Ideal para clases online. Funciona perfectamente.', co2: 10.0, likes: [], posted: 'hace 8h', want: 'Micrófono o audífonos', faculty: 'Comunicaciones' },
  { id: '5', title: 'Pack Libros Economía I + II', category: 'Libros', user: 'Valeria C.', userId: '6', avatar: 'VC', avatarColor: '#E57373', condition: 'Regular', bgColor: '#FFEBEE', description: 'Mankiw Principios de Economía y Microeconomía. Tienen algunos apuntes al margen, muy útiles.', co2: 4.8, likes: [], posted: 'hace 1d', want: 'Libros de administración o marketing', faculty: 'Economía' },
  { id: '6', title: 'Teclado mecánico Redragon K552', category: 'Tecnología', user: 'Marco T.', userId: '7', avatar: 'MT', avatarColor: '#4DB6AC', condition: 'Buen estado', bgColor: '#E0F2F1', description: 'Teclado mecánico TKL, switches rojos. RGB funcional. Sin keycaps faltantes.', co2: 11.0, likes: [], posted: 'hace 1d', want: 'Mouse gaming o auriculares', faculty: 'Ingeniería' },
  { id: '7', title: 'Celular Samsung A32 – 128GB', category: 'Tecnología', user: 'Sofía M.', userId: '8', avatar: 'SM', avatarColor: '#FF8A65', condition: 'Buen estado', bgColor: '#FBE9E7', description: 'Samsung Galaxy A32, 128GB, cámara 64MP. Con cargador original. Sin golpes.', co2: 15.0, likes: [], posted: 'hace 2d', want: 'Laptop o tablet', faculty: 'Psicología' },
  { id: '8', title: 'Mochila Samsonite 30L', category: 'Accesorios', user: 'Rodrigo B.', userId: '9', avatar: 'RB', avatarColor: '#78909C', condition: 'Buen estado', bgColor: '#ECEFF1', description: "Mochila negra con compartimiento para laptop hasta 15.6'. En buen estado, cierre funciona.", co2: 3.5, likes: [], posted: 'hace 3d', want: 'Libros o útiles de oficina', faculty: 'Derecho' },
];

export const CO2_BY_CATEGORY = {
  Libros: 2.4,
  Tecnología: 12.5,
  Ropa: 5.0,
  Accesorios: 3.5,
};

export const CATEGORIES = ['Todos', 'Libros', 'Tecnología', 'Ropa', 'Accesorios'];

export const FACULTIES = [
  'Ingeniería Industrial',
  'Ingeniería de Sistemas',
  'Diseño Gráfico',
  'Administración',
  'Comunicaciones',
  'Economía',
  'Psicología',
  'Derecho',
  'Arquitectura',
  'Marketing',
  'Nutrición',
  'Otra',
];
