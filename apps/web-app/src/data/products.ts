export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  tags: Record<string, string>;
}

export const products: Product[] = [
  {
    id: '1',
    title: 'Loro Noruego Azul (Finado)',
    description: 'Este es un loro que ya no existe. Ha expirado y se ha ido a encontrar con su creador. Es un loro ex-vivo. Sus plumas son de un azul noruego precioso, aunque un poco tiesas.',
    images: [
      'https://picsum.photos/id/1025/600/400',
      'https://picsum.photos/id/1024/600/400',
      'https://picsum.photos/id/1023/600/400'
    ],
    tags: { CATEGORY: 'Mascotas', STATUS: 'Finado' }
  },
  {
    id: '2',
    title: 'El Santo Grial',
    description: 'No es una simple copa. Es EL Grial. Cuidado con el conejo asesino que lo custodia. Se requiere saber la velocidad de vuelo de una golondrina sin carga (africana o europea).',
    images: [
      'https://picsum.photos/id/103/600/400',
      'https://picsum.photos/id/104/600/400'
    ],
    tags: { CATEGORY: 'Reliquias', QUEST: 'Búsqueda' }
  },
  {
    id: '3',
    title: 'Spam de Primera Calidad',
    description: 'Spam, spam, spam, spam, spam, spam, spam, spam, spam, spam, spam, spam, spam. Delicioso spam para desayunar, comer y cenar. Acompañado de más spam.',
    images: [
      'https://picsum.photos/id/1062/600/400'
    ],
    tags: { CATEGORY: 'Comida', INGREDIENT: 'Spam' }
  },
  {
    id: '4',
    title: 'Kit de Iniciación al Ministerio de Andares Silenciosos',
    description: 'Aprende a caminar de la forma más ridícula posible con este manual oficial. Incluye bastón y sombrero de copa (opcionales para el nivel avanzado).',
    images: [
      'https://picsum.photos/id/1074/600/400',
      'https://picsum.photos/id/1084/600/400'
    ],
    tags: { CATEGORY: 'Servicios', STYLE: 'Ridículo' }
  }
];
