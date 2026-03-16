import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BeforeAfterModal from '../../components/BeforeAfterModal'
import { ResourceSelection } from '../../components/ResouceSelection'

// Mock child components with heavy dependencies
vi.mock('../../components/VideoStoreSelector', () => ({
  default: () => <div data-testid="video-store-selector" />,
}))

vi.mock('../../components/SyncDelayIndicator', () => ({
  SyncDelayIndicator: () => <div data-testid="sync-delay-indicator" />,
}))

vi.mock('../../components/ImageDisplay', () => ({
  default: ({ alt }: { alt?: string }) => (
    <img alt={alt} data-testid="image-display" />
  ),
}))

// Mock context hooks
vi.mock('../../lib/contexts/ViamClientContext', () => ({
  useViamClients: vi.fn(),
}))

vi.mock('../../lib/contexts/CameraContext', () => ({
  useCamera: vi.fn(),
}))

vi.mock('../../lib/contexts/VideoStoreContext', () => ({
  useVideoStore: vi.fn(),
}))

import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useCamera } from '../../lib/contexts/CameraContext'
import { useVideoStore } from '../../lib/contexts/VideoStoreContext'

const mockBinaryDataFile = (overrides = {}) =>
  ({
    binaryDataId: 'test-id',
    fileName: 'test-file.jpg',
    timeRequested: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  }) as any

describe('BeforeAfterModal', () => {
  it('renders nothing when both images are null', () => {
    const { container } = render(
      <BeforeAfterModal
        beforeImage={null}
        afterImage={null}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows placeholder when beforeImage is null', () => {
    render(
      <BeforeAfterModal
        beforeImage={null}
        afterImage={mockBinaryDataFile()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('No before image available')).toBeInTheDocument()
  })

  it('shows placeholder when afterImage is null', () => {
    render(
      <BeforeAfterModal
        beforeImage={mockBinaryDataFile()}
        afterImage={null}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('No after image available')).toBeInTheDocument()
  })

  it('renders both images when both are provided', () => {
    render(
      <BeforeAfterModal
        beforeImage={mockBinaryDataFile()}
        afterImage={mockBinaryDataFile()}
        onClose={vi.fn()}
      />
    )
    const images = screen.getAllByTestId('image-display')
    expect(images).toHaveLength(2)
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BeforeAfterModal
        beforeImage={mockBinaryDataFile()}
        afterImage={null}
        onClose={onClose}
      />
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <BeforeAfterModal
        beforeImage={mockBinaryDataFile()}
        afterImage={null}
        onClose={onClose}
      />
    )
    fireEvent.click(container.querySelector('.before-after-modal-overlay')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <BeforeAfterModal
        beforeImage={mockBinaryDataFile()}
        afterImage={null}
        onClose={onClose}
      />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ResourceSelection', () => {
  beforeEach(() => {
    vi.mocked(useVideoStore).mockReturnValue({
      videoStoreClient: null,
      setVideoStoreClient: vi.fn(),
    })
  })

  const mockViamClients = (overrides = {}) =>
    vi.mocked(useViamClients).mockReturnValue({
      robotClient: null,
      machineName: '',
      viamClient: {} as any,
      locationId: 'loc1',
      machineId: 'machine1',
      organizationId: 'org1',
      partId: 'part1',
      ...overrides,
    })

  const mockCameraContext = (overrides = {}) =>
    vi.mocked(useCamera).mockReturnValue({
      selectedCamera: '',
      setSelectedCamera: vi.fn(),
      cameraComponentNames: [],
      registerCameraNames: vi.fn(),
      ...overrides,
    })

  it('displays machine name when provided', () => {
    mockViamClients({ machineName: 'my-robot' })
    mockCameraContext()
    render(<ResourceSelection />)
    expect(screen.getByText('my-robot')).toBeInTheDocument()
    expect(screen.getByText('Machine name')).toBeInTheDocument()
  })

  it('hides machine name section when machineName is empty', () => {
    mockViamClients({ machineName: '' })
    mockCameraContext()
    render(<ResourceSelection />)
    expect(screen.queryByText('Machine name')).not.toBeInTheDocument()
  })

  it('shows connect message when not connected to a robot', () => {
    mockViamClients({ robotClient: null, machineName: 'my-robot' })
    mockCameraContext()
    render(<ResourceSelection />)
    expect(
      screen.getByText('Connect to a robot to select a camera')
    ).toBeInTheDocument()
  })

  it('shows no cameras message when connected but no camera resources exist', () => {
    mockViamClients({ robotClient: {} as any, machineName: 'my-robot' })
    mockCameraContext({ cameraComponentNames: [] })
    render(<ResourceSelection />)
    expect(screen.getByText('No camera resources found')).toBeInTheDocument()
  })

  it('renders camera dropdown with available cameras', () => {
    mockViamClients({ robotClient: {} as any, machineName: 'my-robot' })
    mockCameraContext({ cameraComponentNames: ['cam-front', 'cam-rear'] })
    render(<ResourceSelection />)
    const select = screen.getByRole('combobox', { name: /camera resource/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByText('cam-front')).toBeInTheDocument()
    expect(screen.getByText('cam-rear')).toBeInTheDocument()
  })

  it('calls setSelectedCamera when a camera option is selected', async () => {
    const setSelectedCamera = vi.fn()
    mockViamClients({ robotClient: {} as any, machineName: 'my-robot' })
    mockCameraContext({
      cameraComponentNames: ['cam-front', 'cam-rear'],
      setSelectedCamera,
    })
    render(<ResourceSelection />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /camera resource/i }),
      'cam-front'
    )
    expect(setSelectedCamera).toHaveBeenCalledWith('cam-front')
  })
})
