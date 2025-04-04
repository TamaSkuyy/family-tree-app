import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Family Tree App heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Family Tree App/i);
  expect(headingElement).toBeInTheDocument();
});
