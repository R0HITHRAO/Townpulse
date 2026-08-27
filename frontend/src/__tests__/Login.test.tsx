import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Login } from '../pages/Login';

describe('Login Page', () => {
  it('renders login form with email and password inputs', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText('Sign in to TownPulse')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('switches between Email and Phone OTP tabs', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const phoneTabBtn = screen.getByRole('button', { name: /phone otp/i });
    fireEvent.click(phoneTabBtn);

    expect(screen.getByPlaceholderText('+919876543210')).toBeInTheDocument();
    expect(screen.getByText('Send Verification Code')).toBeInTheDocument();
  });
});
