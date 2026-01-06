import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders login page by default', () => {
    render(<App />);
    expect(screen.getByText('Welcome back! Please login to continue')).toBeInTheDocument();
  });

  it('redirects to dashboard after login', async () => {
    render(<App />);
    
    // Mock the onLogin function
    const onLogin = vi.fn();
    const { getByLabelText, getByText } = render(<Login onLogin={onLogin} />);
    
    // Simulate user input
    fireEvent.change(getByLabelText('Email Address'), { target: { value: 'admin@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password' } });
    
    // Simulate form submission
    fireEvent.click(getByText('Login'));
    
    // Wait for the login process to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if onLogin was called
    expect(onLogin).toHaveBeenCalled();
  });
});
