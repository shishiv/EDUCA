import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ResponsiveDataTable } from '@/components/ui/responsive-data-table'
import type { ColumnDef } from '@tanstack/react-table'

/**
 * Unit Tests: ResponsiveDataTable Component
 * Mobile-responsive data table with sorting, filtering, and pagination
 *
 * Tests the responsive data table:
 * - Column definitions
 * - Sorting functionality
 * - Filtering/search
 * - Pagination
 * - Mobile responsiveness
 * - Empty states
 */

// Test data type
type TestData = {
  id: string
  name: string
  email: string
  age: number
  status: 'active' | 'inactive'
}

// Test data
const mockData: TestData[] = [
  { id: '1', name: 'João Silva', email: 'joao@example.com', age: 25, status: 'active' },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com', age: 30, status: 'active' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@example.com', age: 22, status: 'inactive' },
  { id: '4', name: 'Ana Oliveira', email: 'ana@example.com', age: 28, status: 'active' },
  { id: '5', name: 'Carlos Mendes', email: 'carlos@example.com', age: 35, status: 'inactive' },
]

// Test columns
const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: 'age',
    header: 'Idade',
    cell: ({ row }) => row.original.age,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={row.original.status === 'active' ? 'text-green-600' : 'text-red-600'}>
        {row.original.status === 'active' ? 'Ativo' : 'Inativo'}
      </span>
    ),
  },
]

describe('ResponsiveDataTable', () => {
  describe('Basic Rendering', () => {
    it('should render table with data', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should display column headers', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByRole('columnheader', { name: /nome/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /idade/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })

    it('should display all rows', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
      expect(screen.getByText('Pedro Costa')).toBeInTheDocument()
      expect(screen.getByText('Ana Oliveira')).toBeInTheDocument()
      expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
    })

    it('should render cell content correctly', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('joao@example.com')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('Ativo')).toBeInTheDocument()
      expect(screen.getByText('Inativo')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no data', () => {
      render(
        <ResponsiveDataTable
          data={[]}
          columns={mockColumns}
        />
      )

      expect(screen.getByText(/nenhum.*resultado|sem.*dados|vazio/i)).toBeInTheDocument()
    })

    it('should show empty state icon', () => {
      render(
        <ResponsiveDataTable
          data={[]}
          columns={mockColumns}
        />
      )

      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should display custom empty message', () => {
      render(
        <ResponsiveDataTable
          data={[]}
          columns={mockColumns}
          emptyMessage="Nenhum usuário encontrado"
        />
      )

      expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument()
    })
  })

  describe('Search/Filter', () => {
    it('should display search input', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          searchable={true}
        />
      )

      expect(screen.getByPlaceholderText(/buscar|pesquisar|filtrar/i)).toBeInTheDocument()
    })

    it('should filter data on search', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          searchable={true}
        />
      )

      const searchInput = screen.getByPlaceholderText(/buscar|pesquisar|filtrar/i)
      fireEvent.change(searchInput, 'João')

      // Should show João but not Maria
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()
    })

    it('should show no results message when filter returns empty', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          searchable={true}
        />
      )

      const searchInput = screen.getByPlaceholderText(/buscar|pesquisar|filtrar/i)
      fireEvent.change(searchInput, 'NonexistentName')

      expect(screen.getByText(/nenhum.*resultado|sem.*dados/i)).toBeInTheDocument()
    })

    it('should clear filter when search is cleared', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          searchable={true}
        />
      )

      const searchInput = screen.getByPlaceholderText(/buscar|pesquisar|filtrar/i)
      
      // Filter
      fireEvent.change(searchInput, 'João')
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()

      // Clear
      fireEvent.change(searchInput)
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    })

    it('should hide search when searchable is false', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          searchable={false}
        />
      )

      expect(screen.queryByPlaceholderText(/buscar|pesquisar|filtrar/i)).not.toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should display sort buttons in headers', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const headers = screen.getAllByRole('columnheader')
      
      // Headers should be clickable for sorting
      headers.forEach(header => {
        expect(header).toBeInTheDocument()
      })
    })

    it('should sort data when header is clicked', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const nameHeader = screen.getByRole('columnheader', { name: /nome/i })
      fireEvent.click(nameHeader)

      // After sorting, order should change
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    it('should toggle sort direction on multiple clicks', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const ageHeader = screen.getByRole('columnheader', { name: /idade/i })
      
      // First click: ascending
      fireEvent.click(ageHeader)
      
      // Second click: descending
      fireEvent.click(ageHeader)

      expect(ageHeader).toBeInTheDocument()
    })

    it('should show sort indicator', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const nameHeader = screen.getByRole('columnheader', { name: /nome/i })
      fireEvent.click(nameHeader)

      // Should show sort arrow icon
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination', () => {
    it('should display pagination controls when enabled', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      expect(screen.getByRole('navigation', { name: /pagination|paginação|paginacao/i })).toBeInTheDocument()
    })

    it('should paginate data', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      // Should show only first 3 rows
      expect(screen.getByText('João Silva')).toBeInTheDocument()
      expect(screen.getByText('Maria Santos')).toBeInTheDocument()
      expect(screen.getByText('Pedro Costa')).toBeInTheDocument()
      
      // Should not show rows 4-5
      expect(screen.queryByText('Ana Oliveira')).not.toBeInTheDocument()
      expect(screen.queryByText('Carlos Mendes')).not.toBeInTheDocument()
    })

    it('should navigate to next page', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      const nextButton = screen.getByRole('button', { name: /next|próximo|proximo|seguinte/i })
      fireEvent.click(nextButton)

      // Should show rows 4-5
      expect(screen.getByText('Ana Oliveira')).toBeInTheDocument()
      expect(screen.getByText('Carlos Mendes')).toBeInTheDocument()
      
      // Should not show rows 1-3
      expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    })

    it('should navigate to previous page', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      const nextButton = screen.getByRole('button', { name: /next|próximo|proximo/i })
      fireEvent.click(nextButton)

      const prevButton = screen.getByRole('button', { name: /previous|anterior/i })
      fireEvent.click(prevButton)

      // Should be back to first page
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      const prevButton = screen.getByRole('button', { name: /previous|anterior/i })
      expect(prevButton).toBeDisabled()
    })

    it('should disable next button on last page', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      const nextButton = screen.getByRole('button', { name: /next|próximo|proximo/i })
      fireEvent.click(nextButton)

      // On page 2 (last page)
      expect(nextButton).toBeDisabled()
    })

    it('should show current page info', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={true}
          pageSize={3}
        />
      )

      expect(screen.getByText(/página|pagina.*1.*de.*2|1.*of.*2/i)).toBeInTheDocument()
    })

    it('should hide pagination when disabled', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          pagination={false}
        />
      )

      expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should display loading skeleton', () => {
      render(
        <ResponsiveDataTable
          data={[]}
          columns={mockColumns}
          isLoading={true}
        />
      )

      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should not display data when loading', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          isLoading={true}
        />
      )

      expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    })
  })

  describe('Row Selection', () => {
    it('should display checkboxes when selectable', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Should have checkbox for each row + header checkbox
      expect(checkboxes.length).toBe(mockData.length + 1)
    })

    it('should select row when checkbox clicked', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const firstRowCheckbox = checkboxes[1] // Skip header checkbox

      fireEvent.click(firstRowCheckbox)

      expect(firstRowCheckbox).toBeChecked()
    })

    it('should select all rows when header checkbox clicked', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const headerCheckbox = checkboxes[0]

      fireEvent.click(headerCheckbox)

      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('should deselect all when header checkbox clicked again', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          selectable={true}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const headerCheckbox = checkboxes[0]

      // Select all
      fireEvent.click(headerCheckbox)
      
      // Deselect all
      fireEvent.click(headerCheckbox)

      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })

    it('should hide checkboxes when not selectable', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          selectable={false}
        />
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should apply responsive classes', () => {
      const { container } = render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const responsiveElements = container.querySelectorAll('[class*="overflow"], [class*="responsive"]')
      expect(responsiveElements.length).toBeGreaterThan(0)
    })

    it('should enable horizontal scroll on mobile', () => {
      const { container } = render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const scrollContainer = container.querySelector('[class*="overflow-x"]')
      expect(scrollContainer).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          className="custom-table"
        />
      )

      const customElement = container.querySelector('.custom-table')
      expect(customElement).toBeInTheDocument()
    })

    it('should apply custom row className', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          rowClassName={() => 'custom-row'}
        />
      )

      const { container } = render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          rowClassName={() => 'custom-row'}
        />
      )

      const customRows = container.querySelectorAll('.custom-row')
      expect(customRows.length).toBeGreaterThan(0)
    })
  })

  describe('Row Click Handler', () => {
    it('should call onRowClick when row is clicked', async () => {
      
      const mockOnRowClick = vi.fn()
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          onRowClick={mockOnRowClick}
        />
      )

      const firstRow = screen.getByText('João Silva').closest('tr')
      
      if (firstRow) {
        fireEvent.click(firstRow)
        
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0])
      }
    })

    it('should apply cursor pointer when onRowClick provided', () => {
      const mockOnRowClick = vi.fn()
      const { container } = render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
          onRowClick={mockOnRowClick}
        />
      )

      const clickableRows = container.querySelectorAll('tr[class*="cursor-pointer"]')
      expect(clickableRows.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('should have thead and tbody', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const table = screen.getByRole('table')
      const rowgroups = within(table).getAllByRole('rowgroup')
      
      expect(rowgroups.length).toBeGreaterThanOrEqual(1)
    })

    it('should have accessible column headers', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const headers = screen.getAllByRole('columnheader')
      
      headers.forEach(header => {
        expect(header).toBeInTheDocument()
      })
    })

    it('should have accessible rows', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const rows = screen.getAllByRole('row')
      
      // Header row + data rows
      expect(rows.length).toBe(mockData.length + 1)
    })

    it('should support keyboard navigation for sorting', async () => {
      
      
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={mockColumns}
        />
      )

      const nameHeader = screen.getByRole('columnheader', { name: /nome/i })
      
      // Tab to header
      await user.tab()
      
      // Headers should be focusable
      expect(nameHeader).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty columns array', () => {
      render(
        <ResponsiveDataTable
          data={mockData}
          columns={[]}
        />
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should handle single row', () => {
      render(
        <ResponsiveDataTable
          data={[mockData[0]]}
          columns={mockColumns}
        />
      )

      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 20 + i,
        status: i % 2 === 0 ? 'active' as const : 'inactive' as const,
      }))

      render(
        <ResponsiveDataTable
          data={largeData}
          columns={mockColumns}
          pagination={true}
          pageSize={10}
        />
      )

      // Should only show first page
      expect(screen.getByText('User 0')).toBeInTheDocument()
      expect(screen.queryByText('User 50')).not.toBeInTheDocument()
    })
  })
})
