import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusBadge } from '../../components/StatusBadge'
import Button from '../../components/Button'
import RenderIf from '../../components/RenderIf'
import Spinner from '../../components/Spinner'
import { LoadingIndicator } from '../../components/LoadingIndicator'

describe('StatusBadge', () => {
  it('shows Success when success=true', () => {
    render(<StatusBadge success={true} />)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('shows Failed when success=false', () => {
    render(<StatusBadge success={false} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('applies green styling for success', () => {
    render(<StatusBadge success={true} />)
    const badge = screen.getByText('Success')
    expect(badge.className).toContain('green')
  })

  it('applies red styling for failure', () => {
    render(<StatusBadge success={false} />)
    const badge = screen.getByText('Failed')
    expect(badge.className).toContain('red')
  })
})

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('shows loading text when loading=true', () => {
    render(<Button loading loadingText="Saving...">Save</Button>)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('RenderIf', () => {
  it('renders children when condition is true', () => {
    render(<RenderIf condition={true}><span>visible</span></RenderIf>)
    expect(screen.getByText('visible')).toBeInTheDocument()
  })

  it('renders nothing when condition is false', () => {
    render(<RenderIf condition={false}><span>hidden</span></RenderIf>)
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })
})

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />)
    const span = container.firstChild as HTMLElement
    expect(span.style.width).toBe('28px')
    expect(span.style.height).toBe('28px')
  })

  it('renders with custom size', () => {
    const { container } = render(<Spinner size="48px" />)
    const span = container.firstChild as HTMLElement
    expect(span.style.width).toBe('48px')
    expect(span.style.height).toBe('48px')
  })
})

describe('LoadingIndicator', () => {
  it('displays loading text', () => {
    render(<LoadingIndicator loadingText="Fetching data..." />)
    expect(screen.getByText('Fetching data...')).toBeInTheDocument()
  })
})
