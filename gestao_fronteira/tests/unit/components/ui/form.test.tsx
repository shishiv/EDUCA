import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Unit Tests: Form Component
 * Shadcn UI Form primitives based on react-hook-form
 *
 * Tests the base form components:
 * - Form provider
 * - FormField wrapper
 * - FormItem container
 * - FormLabel
 * - FormControl
 * - FormDescription
 * - FormMessage (error display)
 */

// Test schema
const testSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.number().min(18, 'Deve ser maior de 18 anos').optional(),
})

type TestFormData = z.infer<typeof testSchema>

// Test form component
function TestForm({ onSubmit }: { onSubmit: (data: TestFormData) => void }) {
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Digite seu nome" />
              </FormControl>
              <FormDescription>Seu nome completo</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="email@exemplo.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Enviar</Button>
      </form>
    </Form>
  )
}

describe('Form Components', () => {
  describe('Form Provider', () => {
    it('should render form with react-hook-form context', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('should provide form context to children', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
  })

  describe('FormField', () => {
    it('should render form field with label', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    })

    it('should connect input to react-hook-form', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      fireEvent.change(nameInput, 'João Silva')

      expect(nameInput).toHaveValue('João Silva')
    })

    it('should pass field props to control component', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      fireEvent.change(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  describe('FormItem', () => {
    it('should render form item container', () => {
      const mockSubmit = vi.fn()
      const { container } = render(<TestForm onSubmit={mockSubmit} />)

      // FormItem adds space-y-2 class
      const formItems = container.querySelectorAll('.space-y-2')
      expect(formItems.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs for form items', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      expect(nameInput.id).toBeTruthy()
      expect(emailInput.id).toBeTruthy()
      expect(nameInput.id).not.toBe(emailInput.id)
    })
  })

  describe('FormLabel', () => {
    it('should render label with correct text', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByText('Nome')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('should associate label with input', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameLabel = screen.getByText('Nome')
      const nameInput = screen.getByLabelText('Nome')

      expect(nameLabel).toHaveAttribute('for', nameInput.id)
    })

    it('should apply error styling when field has error', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const nameLabel = screen.getByText('Nome')
        expect(nameLabel).toHaveClass('text-destructive')
      })
    })
  })

  describe('FormControl', () => {
    it('should render input wrapped in FormControl', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByPlaceholderText('Digite seu nome')
      expect(nameInput).toBeInTheDocument()
    })

    it('should maintain input functionality', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      fireEvent.change(nameInput, 'Test User')

      expect(nameInput).toHaveValue('Test User')
    })
  })

  describe('FormDescription', () => {
    it('should render description text', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByText('Seu nome completo')).toBeInTheDocument()
    })

    it('should have proper styling', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const description = screen.getByText('Seu nome completo')
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('should be optional (email field has no description)', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const emailField = screen.getByLabelText('Email').parentElement?.parentElement
      const description = emailField?.querySelector('.text-muted-foreground')

      // Email field should not have description
      expect(description).not.toBeInTheDocument()
    })
  })

  describe('FormMessage (Error Display)', () => {
    it('should not show error message initially', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.queryByText(/nome deve ter pelo menos/i)).not.toBeInTheDocument()
    })

    it('should show validation error on submit', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos 3 caracteres/i)).toBeInTheDocument()
      })
    })

    it('should show error for invalid email', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const emailInput = screen.getByLabelText('Email')
      fireEvent.change(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email inválido|email invalido/i)).toBeInTheDocument()
      })
    })

    it('should clear error when field becomes valid', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      // Trigger error
      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos/i)).toBeInTheDocument()
      })

      // Fix error
      const nameInput = screen.getByLabelText('Nome')
      fireEvent.change(nameInput, 'João Silva')

      await waitFor(() => {
        expect(screen.queryByText(/nome deve ter pelo menos/i)).not.toBeInTheDocument()
      })
    })

    it('should apply error styling', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/nome deve ter pelo menos/i)
        expect(errorMessage).toHaveClass('text-sm', 'font-medium', 'text-destructive')
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate on submit', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).not.toHaveBeenCalled()
        expect(screen.getByText(/nome deve ter pelo menos/i)).toBeInTheDocument()
      })
    })

    it('should call onSubmit with valid data', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      fireEvent.change(nameInput, 'João Silva')
      fireEvent.change(emailInput, 'joao@example.com')

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: 'João Silva',
          email: 'joao@example.com',
        })
      })
    })

    it('should validate minimum length', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      fireEvent.change(nameInput, 'Jo') // Too short

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos 3 caracteres/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      fireEvent.change(nameInput, 'João Silva')
      fireEvent.change(emailInput, 'not-an-email')

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email inválido|email invalido/i)).toBeInTheDocument()
        expect(mockSubmit).not.toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      expect(nameInput).toHaveAccessibleName('Nome')
      expect(emailInput).toHaveAccessibleName('Email')
    })

    it('should associate errors with inputs', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Nome')
        const errorMessage = screen.getByText(/nome deve ter pelo menos/i)

        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        expect(nameInput).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard navigation', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')

      // Tab to input
      // Tab navigation

      expect(nameInput).toHaveFocus()
    })

    it('should associate description with input', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const description = screen.getByText('Seu nome completo')

      // Input should have aria-describedby pointing to description
      const describedBy = nameInput.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
    })
  })

  describe('Error Recovery', () => {
    it('should allow fixing validation errors', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos/i)).toBeInTheDocument()
      })

      // Fix the error
      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      fireEvent.change(nameInput, 'João Silva')
      fireEvent.change(emailInput, 'joao@example.com')

      // Submit again
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: 'João Silva',
          email: 'joao@example.com',
        })
      })
    })

    it('should clear individual field errors', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos/i)).toBeInTheDocument()
        expect(screen.getByText(/email inválido|email invalido/i)).toBeInTheDocument()
      })

      // Fix name only
      const nameInput = screen.getByLabelText('Nome')
      fireEvent.change(nameInput, 'João Silva')

      await waitFor(() => {
        expect(screen.queryByText(/nome deve ter pelo menos/i)).not.toBeInTheDocument()
        expect(screen.getByText(/email inválido|email invalido/i)).toBeInTheDocument()
      })
    })
  })

  describe('Input States', () => {
    it('should handle disabled state', () => {
      function DisabledForm() {
        const form = useForm<TestFormData>()

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )
      }

      render(<DisabledForm />)

      const nameInput = screen.getByLabelText('Nome')
      expect(nameInput).toBeDisabled()
    })

    it('should handle placeholder text', () => {
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      expect(screen.getByPlaceholderText('Digite seu nome')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('email@exemplo.com')).toBeInTheDocument()
    })
  })

  describe('Multiple Fields', () => {
    it('should handle multiple fields independently', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const nameInput = screen.getByLabelText('Nome')
      const emailInput = screen.getByLabelText('Email')

      fireEvent.change(nameInput, 'João')
      fireEvent.change(emailInput, 'joao@example.com')

      expect(nameInput).toHaveValue('João')
      expect(emailInput).toHaveValue('joao@example.com')
    })

    it('should validate all fields on submit', async () => {
      
      const mockSubmit = vi.fn()
      render(<TestForm onSubmit={mockSubmit} />)

      const submitButton = screen.getByRole('button', { name: /enviar/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nome deve ter pelo menos/i)).toBeInTheDocument()
        expect(screen.getByText(/email inválido|email invalido/i)).toBeInTheDocument()
      })
    })
  })
})
