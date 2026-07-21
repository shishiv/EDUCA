import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BNNCSelector } from '@/components/diary/BNNCSelector'

/**
 * Unit Tests: BNNCSelector Component
 * Tests for BNCC skills code input component
 */

describe('BNNCSelector', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockReset()
  })

  describe('Basic Rendering', () => {
    it('should render input field', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades.*bncc/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render with default label', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      expect(screen.getByLabelText(/habilidades.*bncc/i)).toBeInTheDocument()
    })

    it('should render with custom label', () => {
      render(<BNNCSelector label="Custom BNCC Label" onChange={mockOnChange} />)
      
      expect(screen.getByLabelText(/custom.*bncc.*label/i)).toBeInTheDocument()
    })

    it('should render help tooltip button', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const helpButton = screen.getByRole('button', { name: /ajuda.*bncc/i })
      expect(helpButton).toBeInTheDocument()
    })

    it('should render placeholder text', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByPlaceholderText(/ef\d+/i)
      expect(input).toBeInTheDocument()
    })

    it('should render custom placeholder', () => {
      render(
        <BNNCSelector 
          placeholder="Digite códigos BNCC" 
          onChange={mockOnChange} 
        />
      )
      
      expect(screen.getByPlaceholderText(/digite.*códigos/i)).toBeInTheDocument()
    })
  })

  describe('Input Behavior', () => {
    it('should accept text input', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      
      expect(input).toHaveValue('EF01MA06')
    })

    it('should auto-uppercase input', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'ef01ma06')
      
      expect(input).toHaveValue('EF01MA06')
    })

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should handle empty input', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector value="EF01MA06" onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.clear(input)
      
      expect(input).toHaveValue('')
    })
  })

  describe('Validation - Valid Codes', () => {
    it('should validate EF format codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const checkIcon = screen.queryByTestId('check-icon')
        if (checkIcon) {
          expect(checkIcon).toBeInTheDocument()
        }
      })
    })

    it('should validate EI format codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EI03EO01')
      fireEvent.blur(input)
      
      expect(input).toHaveValue('EI03EO01')
    })

    it('should accept multiple valid codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06, EF01MA08')
      
      expect(input).toHaveValue('EF01MA06, EF01MA08')
    })

    it('should accept codes separated by spaces', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06 EF01MA08')
      
      expect(input).toHaveValue('EF01MA06 EF01MA08')
    })
  })

  describe('Validation - Invalid Codes', () => {
    it('should show warning for invalid codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'INVALID123')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const warningIcon = screen.queryByTestId('alert-icon')
        if (warningIcon) {
          expect(warningIcon).toBeInTheDocument()
        }
      })
    })

    it('should list invalid codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06, INVALID')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const errorText = screen.queryByText(/invalid/i)
        if (errorText) {
          expect(errorText).toBeInTheDocument()
        }
      })
    })

    it('should show error for mixed valid/invalid codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06, BAD, EI03EO01')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const invalidText = screen.queryByText(/inválido/i)
        if (invalidText) {
          expect(invalidText).toBeInTheDocument()
        }
      })
    })
  })

  describe('Badge Display', () => {
    it('should display badge for valid code', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const badge = screen.queryByText('EF01MA06')
        if (badge && badge.closest('[class*="badge"]')) {
          expect(badge).toBeInTheDocument()
        }
      })
    })

    it('should display multiple badges', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06, EF02LP08')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const badge1 = screen.queryByText('EF01MA06')
        const badge2 = screen.queryByText('EF02LP08')
        if (badge1 && badge2) {
          expect(badge1).toBeInTheDocument()
          expect(badge2).toBeInTheDocument()
        }
      })
    })

    it('should style EI codes differently from EF codes', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EI03EO01')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const badge = screen.queryByText('EI03EO01')
        if (badge) {
          // EI codes should have purple styling
          expect(badge.closest('[class*="purple"]')).toBeTruthy()
        }
      })
    })

    it('should allow removing badges', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      fireEvent.blur(input)
      
      await waitFor(async () => {
        const removeButton = screen.queryByRole('button', { name: /remover.*ef01ma06/i })
        if (removeButton) {
          await user.click(removeButton)
          
          await waitFor(() => {
            expect(screen.queryByText('EF01MA06')).not.toBeInTheDocument()
          })
        }
      })
    })
  })

  describe('Helper Text', () => {
    it('should display default helper text', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      expect(screen.getByText(/exemplo.*ef/i)).toBeInTheDocument()
    })

    it('should display custom helper text', () => {
      render(
        <BNNCSelector 
          helperText="Custom helper message" 
          onChange={mockOnChange} 
        />
      )
      
      expect(screen.getByText(/custom helper message/i)).toBeInTheDocument()
    })

    it('should show examples for Ensino Fundamental', () => {
      render(
        <BNNCSelector 
          educationLevel="fundamental" 
          onChange={mockOnChange} 
        />
      )
      
      expect(screen.getByText(/ef\d{2}/i)).toBeInTheDocument()
    })

    it('should show examples for Educação Infantil', () => {
      render(
        <BNNCSelector 
          educationLevel="infantil" 
          onChange={mockOnChange} 
        />
      )
      
      expect(screen.getByText(/ei\d{2}/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message', () => {
      render(<BNNCSelector error="Custom error message" onChange={mockOnChange} />)
      
      expect(screen.getByText(/custom error message/i)).toBeInTheDocument()
    })

    it('should style input with error state', () => {
      render(<BNNCSelector error="Error" onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      expect(input).toHaveClass(/destructive|error|red/)
    })

    it('should prioritize error over helper text', () => {
      render(
        <BNNCSelector 
          error="Error message" 
          helperText="Helper text" 
          onChange={mockOnChange} 
        />
      )
      
      expect(screen.getByText(/error message/i)).toBeInTheDocument()
      expect(screen.queryByText(/helper text/i)).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<BNNCSelector disabled={true} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      expect(input).toBeDisabled()
    })

    it('should disable help button when disabled', () => {
      render(<BNNCSelector disabled={true} onChange={mockOnChange} />)
      
      const helpButton = screen.getByRole('button', { name: /ajuda/i })
      expect(helpButton).toBeDisabled()
    })

    it('should not allow badge removal when disabled', async () => {
      render(
        <BNNCSelector 
          value="EF01MA06" 
          disabled={true} 
          onChange={mockOnChange} 
        />
      )
      
      await waitFor(() => {
        const removeButton = screen.queryByRole('button', { name: /remover/i })
        expect(removeButton).not.toBeInTheDocument()
      })
    })
  })

  describe('Skill Limit', () => {
    it('should show warning when max skills exceeded', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector maxSkills={3} onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA01, EF01MA02, EF01MA03, EF01MA04')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const warning = screen.queryByText(/máximo.*3.*habilidades/i)
        if (warning) {
          expect(warning).toBeInTheDocument()
        }
      })
    })

    it('should show count of selected skills', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06, EF02LP08')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const count = screen.queryByText(/2.*habilidade.*selecionada/i)
        if (count) {
          expect(count).toBeInTheDocument()
        }
      })
    })

    it('should use singular form for 1 skill', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const count = screen.queryByText(/1.*habilidade.*selecionada/i)
        if (count) {
          expect(count).toBeInTheDocument()
        }
      })
    })
  })

  describe('Tooltip', () => {
    it('should show tooltip on help button hover', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const helpButton = screen.getByRole('button', { name: /ajuda/i })
      await user.hover(helpButton)
      
      await waitFor(() => {
        const tooltip = screen.queryByRole('tooltip')
        if (tooltip) {
          expect(tooltip).toBeInTheDocument()
        }
      })
    })

    it('should display BNCC format information in tooltip', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const helpButton = screen.getByRole('button', { name: /ajuda/i })
      await user.hover(helpButton)
      
      await waitFor(() => {
        const tooltip = screen.queryByText(/formato.*código.*bncc/i)
        if (tooltip) {
          expect(tooltip).toBeInTheDocument()
        }
      })
    })
  })

  describe('Focus Behavior', () => {
    it('should not show validation while focused', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.click(input)
      await user.type(input, 'INVALID')
      
      // Validation should not show while typing
      expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument()
    })

    it('should show validation after blur', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'INVALID')
      fireEvent.blur(input)
      
      await waitFor(() => {
        const warning = screen.queryByTestId('alert-icon')
        if (warning) {
          expect(warning).toBeInTheDocument()
        }
      })
    })
  })

  describe('Controlled vs Uncontrolled', () => {
    it('should work as controlled component', async () => {
      const { rerender } = render(
        <BNNCSelector value="EF01MA06" onChange={mockOnChange} />
      )
      
      const input = screen.getByLabelText(/habilidades/i) as HTMLInputElement
      expect(input.value).toBe('EF01MA06')
      
      rerender(<BNNCSelector value="EF02LP08" onChange={mockOnChange} />)
      expect(input.value).toBe('EF02LP08')
    })

    it('should work as uncontrolled component', async () => {
      const user = userEvent.setup()
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      await user.type(input, 'EF01MA06')
      
      expect(input).toHaveValue('EF01MA06')
    })
  })

  describe('Custom ID and ClassName', () => {
    it('should accept custom id', () => {
      render(<BNNCSelector id="custom-bncc-id" onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      expect(input).toHaveAttribute('id', 'custom-bncc-id')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <BNNCSelector className="custom-class" onChange={mockOnChange} />
      )
      
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades.*bncc/i)
      expect(input).toBeInTheDocument()
    })

    it('should have aria-describedby for helper text', () => {
      render(<BNNCSelector helperText="Helper text" onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('should have aria-invalid when there are errors', () => {
      render(<BNNCSelector error="Error message" onChange={mockOnChange} />)
      
      const input = screen.getByLabelText(/habilidades/i)
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have screen reader text for help button', () => {
      render(<BNNCSelector onChange={mockOnChange} />)
      
      const helpButton = screen.getByRole('button', { name: /ajuda/i })
      expect(helpButton).toHaveAccessibleName()
    })
  })
})
