
import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { StudentCard } from '@/components/students/StudentCard';
import { StudentFilters } from '@/components/students/StudentFilters';
import { StudentForm } from '@/components/students/StudentForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Users, AlertCircle } from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/hooks/useAuth';
import { StudentWithDetails, StudentFilters as FiltersType } from '@/lib/types';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from '@/components/ui/pagination';

const PAGE_SIZE = 12;

// PaginationControls: wrapper para paginação baseada nos building blocks do Pagination
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    // Exibe sempre as 2 primeiras, 2 últimas, a atual e vizinhas, com elipses
    if (
      i === 1 ||
      i === totalPages ||
      Math.abs(i - currentPage) <= 1 ||
      (currentPage <= 3 && i <= 4) ||
      (currentPage >= totalPages - 2 && i >= totalPages - 3)
    ) {
      pages.push(i);
    } else if (
      (i === currentPage - 2 && currentPage > 4) ||
      (i === currentPage + 2 && currentPage < totalPages - 3)
    ) {
      pages.push('ellipsis');
    }
  }
  let lastWasEllipsis = false;
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : 0}
            style={{ pointerEvents: currentPage === 1 ? 'none' : undefined, opacity: currentPage === 1 ? 0.5 : 1 }}
          />
        </PaginationItem>
        {pages.map((p, idx) => {
          if (p === 'ellipsis') {
            if (!lastWasEllipsis) {
              lastWasEllipsis = true;
              return (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <span className="px-2">...</span>
                </PaginationItem>
              );
            }
            return null;
          } else {
            lastWasEllipsis = false;
            return (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === currentPage}
                  onClick={() => onPageChange(Number(p))}
                  href="#"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            );
          }
        })}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage === totalPages}
            tabIndex={currentPage === totalPages ? -1 : 0}
            style={{ pointerEvents: currentPage === totalPages ? 'none' : undefined, opacity: currentPage === totalPages ? 0.5 : 1 }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const Students = () => {
  const { profile, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<FiltersType & {
    guardianSearch?: string;
    enrollmentDateStart?: string;
    enrollmentDateEnd?: string;
  }>({
    search: '',
    schoolId: 'all',
    classId: 'all',
    status: 'all',
    guardianSearch: '',
    enrollmentDateStart: '',
    enrollmentDateEnd: '',
  });
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Paginação e ordenação
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'enrollment_number' | 'birth_date' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Resetar página ao mudar filtros
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  const {
    students,
    totalCount,
    isLoading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    isCreating,
    isUpdating,
  } = useStudents(filters, {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortOrder,
  });

  const canEdit = profile?.role === 'admin' || profile?.role === 'secretaria' || profile?.role === 'diretor';

  const handleCreateStudent = () => {
    setSelectedStudent(null);
    setShowForm(true);
  };

  const handleEditStudent = (student: StudentWithDetails) => {
    setSelectedStudent(student);
    setShowForm(true);
  };

  const handleFormSubmit = (data: StudentWithDetails) => {
    if (selectedStudent) {
      updateStudent({ id: selectedStudent.id, data });
    } else {
      createStudent(data);
    }
    setShowForm(false);
    setSelectedStudent(null);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Tem certeza que deseja remover este estudante?')) {
      deleteStudent(id);
    }
  };

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa estar logado para acessar esta página.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Estudantes</h1>
          </div>
          {canEdit && (
            <Button onClick={handleCreateStudent}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Estudante
            </Button>
          )}
        </div>

        {/* Filtros */}
        <StudentFilters filters={filters} onFiltersChange={setFilters} />

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar estudantes: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48"></div>
              </div>
            ))}
          </div>
        )}

        {/* Students Grid */}
        {!isLoading && !error && (
          <>
            {/* Resumo de paginação */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {totalCount} estudante{totalCount === 1 ? '' : 's'} • Página {page} de {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
              </span>
              {/* Ordenação simples */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Ordenar por:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={sortBy}
                  onChange={e =>
                    setSortBy(
                      e.target.value as 'name' | 'enrollment_number' | 'birth_date' | 'status'
                    )
                  }
                >
                  <option value="name">Nome</option>
                  <option value="enrollment_number">Matrícula</option>
                  <option value="birth_date">Nascimento</option>
                  <option value="status">Status</option>
                </select>
                <button
                  className="ml-1 text-blue-600"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                  type="button"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum estudante encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  {filters.search || filters.schoolId !== 'all' || filters.status !== 'all'
                    ? 'Tente ajustar os filtros para encontrar estudantes.'
                    : 'Comece adicionando o primeiro estudante.'}
                </p>
                {canEdit && (
                  <Button onClick={handleCreateStudent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Estudante
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onEdit={handleEditStudent}
                      onDelete={handleDeleteStudent}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
                {/* Paginação */}
                <div className="flex justify-center mt-6">
                  <PaginationControls
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Student Form Modal */}
        <StudentForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedStudent(null);
          }}
          onSubmit={handleFormSubmit}
          student={selectedStudent}
          isLoading={isCreating || isUpdating}
        />
      </div>
    </MainLayout>
  );
};

export default Students;
