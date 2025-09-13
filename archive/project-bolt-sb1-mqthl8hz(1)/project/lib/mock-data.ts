export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  publishYear: number;
  publisher: string;
  pages: number;
  language: string;
  available: boolean;
  totalCopies: number;
  availableCopies: number;
  cover: string;
  rating: number;
  tags: string[];
  location: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'librarian';
  phone?: string;
  address?: string;
  registrationDate: string;
  isActive: boolean;
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  reservationDate: string;
  status: 'pending' | 'ready' | 'collected' | 'cancelled';
  expiryDate: string;
  notificationSent?: boolean;
}

export interface Loan {
  id: string;
  userId: string;
  bookId: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue';
  renewals: number;
  fine?: number;
}

// Mock Books Data
export const mockBooks: Book[] = [
  {
    id: '1',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    isbn: '978-85-359-0277-5',
    category: 'Literatura Brasileira',
    description: 'Romance clássico da literatura brasileira que narra a história de Bentinho e sua obsessão por Capitu.',
    publishYear: 1899,
    publisher: 'Companhia das Letras',
    pages: 256,
    language: 'Português',
    available: true,
    totalCopies: 5,
    availableCopies: 2,
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.5,
    tags: ['clássico', 'romance', 'literatura brasileira'],
    location: 'Seção A - Prateleira 1'
  },
  {
    id: '2',
    title: 'O Cortiço',
    author: 'Aluísio Azevedo',
    isbn: '978-85-08-12345-6',
    category: 'Literatura Brasileira',
    description: 'Romance naturalista que retrata a vida em um cortiço carioca do século XIX.',
    publishYear: 1890,
    publisher: 'Editora Ática',
    pages: 304,
    language: 'Português',
    available: true,
    totalCopies: 4,
    availableCopies: 1,
    cover: 'https://images.pexels.com/photos/1301585/pexels-photo-1301585.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.2,
    tags: ['naturalismo', 'romance', 'século XIX'],
    location: 'Seção A - Prateleira 2'
  },
  {
    id: '3',
    title: 'Grande Sertão: Veredas',
    author: 'Guimarães Rosa',
    isbn: '978-85-359-0543-1',
    category: 'Literatura Brasileira',
    description: 'Obra-prima da literatura brasileira que narra as aventuras do jagunço Riobaldo.',
    publishYear: 1956,
    publisher: 'Nova Fronteira',
    pages: 624,
    language: 'Português',
    available: false,
    totalCopies: 3,
    availableCopies: 0,
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.8,
    tags: ['modernismo', 'sertão', 'jagunço'],
    location: 'Seção A - Prateleira 3'
  },
  {
    id: '4',
    title: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    isbn: '978-85-359-0125-9',
    category: 'Literatura Brasileira',
    description: 'Romance inovador narrado por um defunto autor, marco do realismo brasileiro.',
    publishYear: 1881,
    publisher: 'Companhia das Letras',
    pages: 288,
    language: 'Português',
    available: true,
    totalCopies: 6,
    availableCopies: 4,
    cover: 'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.6,
    tags: ['realismo', 'machado', 'clássico'],
    location: 'Seção A - Prateleira 1'
  },
  {
    id: '5',
    title: 'Iracema',
    author: 'José de Alencar',
    isbn: '978-85-08-09876-3',
    category: 'Literatura Brasileira',
    description: 'Romance indianista que conta a lenda de Iracema, a virgem dos lábios de mel.',
    publishYear: 1865,
    publisher: 'Editora Ática',
    pages: 144,
    language: 'Português',
    available: true,
    totalCopies: 8,
    availableCopies: 6,
    cover: 'https://images.pexels.com/photos/1834403/pexels-photo-1834403.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.1,
    tags: ['romantismo', 'indianismo', 'lenda'],
    location: 'Seção B - Prateleira 1'
  },
  {
    id: '6',
    title: 'Capitães da Areia',
    author: 'Jorge Amado',
    isbn: '978-85-359-0789-3',
    category: 'Literatura Brasileira',
    description: 'Romance que retrata a vida de meninos de rua em Salvador.',
    publishYear: 1937,
    publisher: 'Companhia das Letras',
    pages: 352,
    language: 'Português',
    available: true,
    totalCopies: 5,
    availableCopies: 3,
    cover: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.4,
    tags: ['jorge amado', 'salvador', 'social'],
    location: 'Seção B - Prateleira 2'
  },
  {
    id: '7',
    title: 'Vidas Secas',
    author: 'Graciliano Ramos',
    isbn: '978-85-359-0456-4',
    category: 'Literatura Brasileira',
    description: 'Romance que retrata a vida difícil de uma família sertaneja durante a seca.',
    publishYear: 1938,
    publisher: 'Record',
    pages: 176,
    language: 'Português',
    available: true,
    totalCopies: 7,
    availableCopies: 5,
    cover: 'https://images.pexels.com/photos/1030778/pexels-photo-1030778.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.7,
    tags: ['sertão', 'seca', 'realismo'],
    location: 'Seção B - Prateleira 3'
  },
  {
    id: '8',
    title: 'O Quinze',
    author: 'Rachel de Queiroz',
    isbn: '978-85-08-11234-7',
    category: 'Literatura Brasileira',
    description: 'Romance que aborda a seca de 1915 no Ceará e seus efeitos sociais.',
    publishYear: 1930,
    publisher: 'José Olympio',
    pages: 192,
    language: 'Português',
    available: true,
    totalCopies: 4,
    availableCopies: 2,
    cover: 'https://images.pexels.com/photos/1181772/pexels-photo-1181772.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.3,
    tags: ['rachel queiroz', 'seca', 'nordeste'],
    location: 'Seção C - Prateleira 1'
  },
  {
    id: '9',
    title: 'A Moreninha',
    author: 'Joaquim Manuel de Macedo',
    isbn: '978-85-08-07777-8',
    category: 'Literatura Brasileira',
    description: 'Primeiro romance urbano brasileiro, conta a história de amor entre Augusto e Carolina.',
    publishYear: 1844,
    publisher: 'FTD',
    pages: 208,
    language: 'Português',
    available: true,
    totalCopies: 6,
    availableCopies: 4,
    cover: 'https://images.pexels.com/photos/1301585/pexels-photo-1301585.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 3.9,
    tags: ['romantismo', 'urbano', 'primeiro romance'],
    location: 'Seção C - Prateleira 2'
  },
  {
    id: '10',
    title: 'Erico Veríssimo - O Tempo e o Vento',
    author: 'Erico Veríssimo',
    isbn: '978-85-359-1234-5',
    category: 'Literatura Brasileira',
    description: 'Trilogia épica que narra a história do Rio Grande do Sul através de gerações.',
    publishYear: 1949,
    publisher: 'Globo',
    pages: 896,
    language: 'Português',
    available: false,
    totalCopies: 2,
    availableCopies: 0,
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.9,
    tags: ['épico', 'rio grande do sul', 'história'],
    location: 'Seção C - Prateleira 3'
  }
];

// Mock Users Data
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'student@escola.com',
    role: 'student',
    phone: '(11) 99999-0001',
    address: 'Rua das Flores, 123',
    registrationDate: '2024-01-15',
    isActive: true
  },
  {
    id: '2',
    name: 'Prof. Carlos Santos',
    email: 'teacher@escola.com',
    role: 'teacher',
    phone: '(11) 99999-0002',
    address: 'Av. Paulista, 456',
    registrationDate: '2023-08-20',
    isActive: true
  },
  {
    id: '3',
    name: 'Maria Oliveira',
    email: 'librarian@escola.com',
    role: 'librarian',
    phone: '(11) 99999-0003',
    address: 'Rua dos Livros, 789',
    registrationDate: '2023-01-10',
    isActive: true
  }
];

// Mock Reservations Data
export const mockReservations: Reservation[] = [
  {
    id: '1',
    userId: '1',
    bookId: '3',
    reservationDate: '2024-02-08',
    status: 'pending',
    expiryDate: '2024-02-15',
    notificationSent: false
  },
  {
    id: '2',
    userId: '1',
    bookId: '10',
    reservationDate: '2024-02-09',
    status: 'ready',
    expiryDate: '2024-02-16',
    notificationSent: true
  }
];

// Mock Loans Data
export const mockLoans: Loan[] = [
  {
    id: '1',
    userId: '1',
    bookId: '1',
    loanDate: '2024-01-20',
    dueDate: '2024-02-20',
    status: 'active',
    renewals: 0
  },
  {
    id: '2',
    userId: '1',
    bookId: '4',
    loanDate: '2024-01-25',
    dueDate: '2024-02-25',
    status: 'active',
    renewals: 1
  },
  {
    id: '3',
    userId: '1',
    bookId: '6',
    loanDate: '2024-01-10',
    dueDate: '2024-02-10',
    returnDate: '2024-02-08',
    status: 'returned',
    renewals: 0
  }
];

// Helper functions
export const getBookById = (id: string): Book | undefined => {
  return mockBooks.find(book => book.id === id);
};

export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
};

export const getUserReservations = (userId: string): Reservation[] => {
  return mockReservations.filter(reservation => reservation.userId === userId);
};

export const getUserLoans = (userId: string): Loan[] => {
  return mockLoans.filter(loan => loan.userId === userId);
};

export const getAvailableBooks = (): Book[] => {
  return mockBooks.filter(book => book.available && book.availableCopies > 0);
};

export const searchBooks = (query: string): Book[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockBooks.filter(book => 
    book.title.toLowerCase().includes(lowercaseQuery) ||
    book.author.toLowerCase().includes(lowercaseQuery) ||
    book.category.toLowerCase().includes(lowercaseQuery) ||
    book.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getBooksByCategory = (category: string): Book[] => {
  return mockBooks.filter(book => book.category === category);
};

export const getCategories = (): string[] => {
  return Array.from(new Set(mockBooks.map(book => book.category)));
};