/**
 * Virtual Table Component
 * Efficiently renders large lists (1000+ items) using virtualization
 */

'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface VirtualTableColumn<T> {
  key: string
  header: string
  width?: string
  render: (item: T, index: number) => React.ReactNode
  headerClassName?: string
  cellClassName?: string
}

interface VirtualTableProps<T> {
  data: T[]
  columns: VirtualTableColumn<T>[]
  estimateSize?: number
  overscan?: number
  className?: string
  headerClassName?: string
  rowClassName?: string | ((item: T, index: number) => string)
  onRowClick?: (item: T, index: number) => void
  emptyMessage?: string
  height?: string | number
}

export function VirtualTable<T>({
  data,
  columns,
  estimateSize = 50, // Estimated row height in pixels
  overscan = 5, // Number of rows to render outside visible area
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  emptyMessage = 'Nenhum item encontrado',
  height = '600px'
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan
  })

  if (data.length === 0) {
    return (
      <div className={cn('border rounded-lg', className)}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className={cn(
          'grid gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm sticky top-0 z-10',
          headerClassName
        )}
        style={{
          gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ')
        }}
      >
        {columns.map(column => (
          <div
            key={column.key}
            className={cn('flex items-center', column.headerClassName)}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual scrolling container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const item = data[virtualRow.index]
            const rowClass = typeof rowClassName === 'function'
              ? rowClassName(item, virtualRow.index)
              : rowClassName

            return (
              <div
                key={virtualRow.index}
                className={cn(
                  'grid gap-4 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors text-sm absolute top-0 left-0 w-full',
                  rowClass
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ')
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {columns.map(column => (
                  <div
                    key={column.key}
                    className={cn('flex items-center', column.cellClassName)}
                  >
                    {column.render(item, virtualRow.index)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600">
        Total: {data.length.toLocaleString('pt-BR')} itens
      </div>
    </div>
  )
}

/**
 * Virtual List Component (simpler than table, for single column data)
 */
interface VirtualListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
  height?: string | number
  emptyMessage?: string
}

export function VirtualList<T>({
  data,
  renderItem,
  estimateSize = 60,
  overscan = 5,
  className,
  height = '500px',
  emptyMessage = 'Nenhum item encontrado'
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan
  })

  if (data.length === 0) {
    return (
      <div className={cn('border rounded-lg', className)}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const item = data[virtualRow.index]

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {renderItem(item, virtualRow.index)}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600">
        Total: {data.length.toLocaleString('pt-BR')} itens
      </div>
    </div>
  )
}
