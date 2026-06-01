import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TurmaCardGrid } from '@/components/turmas/TurmaCardGrid'
import '@testing-library/jest-dom'

describe('TurmaCardGrid', () => {
  it('should render children', () => {
    render(
      <TurmaCardGrid>
        <div>Child 1</div>
        <div>Child 2</div>
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })

  it('should apply grid layout classes', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('should have single column on mobile', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.grid-cols-1')
    expect(grid).toBeInTheDocument()
  })

  it('should have 2 columns on medium screens', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.md\\:grid-cols-2')
    expect(grid).toBeInTheDocument()
  })

  it('should have 3 columns on large screens', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.lg\\:grid-cols-3')
    expect(grid).toBeInTheDocument()
  })

  it('should have gap between items', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.gap-4')
    expect(grid).toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(
      <TurmaCardGrid className="custom-class">
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.custom-class')
    expect(grid).toBeInTheDocument()
  })

  it('should merge custom className with default classes', () => {
    const { container } = render(
      <TurmaCardGrid className="mt-8">
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    const grid = container.firstChild as HTMLElement
    expect(grid.classList.contains('grid')).toBe(true)
    expect(grid.classList.contains('mt-8')).toBe(true)
  })

  it('should render empty when no children', () => {
    const { container } = render(<TurmaCardGrid />)
    
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    expect(grid?.children.length).toBe(0)
  })

  it('should render multiple children', () => {
    render(
      <TurmaCardGrid>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
        <div>Card 4</div>
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
    expect(screen.getByText('Card 4')).toBeInTheDocument()
  })

  it('should render complex children', () => {
    render(
      <TurmaCardGrid>
        <div>
          <h2>Title</h2>
          <p>Description</p>
        </div>
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('should be a div element', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Child</div>
      </TurmaCardGrid>
    )
    
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('should handle React fragments as children', () => {
    render(
      <TurmaCardGrid>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('Fragment Child 1')).toBeInTheDocument()
    expect(screen.getByText('Fragment Child 2')).toBeInTheDocument()
  })

  it('should handle null children gracefully', () => {
    render(
      <TurmaCardGrid>
        <div>Visible</div>
        {null}
        {undefined}
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('should handle conditional children', () => {
    const showSecond = false
    
    render(
      <TurmaCardGrid>
        <div>First</div>
        {showSecond && <div>Second</div>}
        <div>Third</div>
      </TurmaCardGrid>
    )
    
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
    expect(screen.getByText('Third')).toBeInTheDocument()
  })

  it('should render with many children (stress test)', () => {
    const children = Array.from({ length: 20 }, (_, i) => (
      <div key={i}>Card {i + 1}</div>
    ))
    
    render(<TurmaCardGrid>{children}</TurmaCardGrid>)
    
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 20')).toBeInTheDocument()
  })

  it('should maintain grid structure with single child', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div>Single Card</div>
      </TurmaCardGrid>
    )
    
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    expect(grid?.children.length).toBe(1)
  })

  it('should be accessible', () => {
    const { container } = render(
      <TurmaCardGrid>
        <div role="article">Card</div>
      </TurmaCardGrid>
    )
    
    const article = container.querySelector('[role="article"]')
    expect(article).toBeInTheDocument()
  })
})
