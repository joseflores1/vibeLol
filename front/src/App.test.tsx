import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Smoke test: ensures <App/> mounts and renders its heading without
// throwing. As real components are added, replace this with targeted tests.
describe('<App/>', () => {
  it('renders the Get started heading', () => {
    render(<App />)
    expect(screen.getByText('Get started')).toBeDefined()
  })
})