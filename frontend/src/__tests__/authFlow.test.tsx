import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Register } from '../pages/Register';
import { Login } from '../pages/Login';
import { isAuthenticated } from '../services/auth';

const TOKEN_RESPONSE = {
  access_token: 'access-token-abc',
  refresh_token: 'refresh-token-abc',
  token_type: 'bearer',
  user: {
    id: 'u-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    role: 'user',
    phone_verified: false,
    email_verified: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  localStorage.clear();
  // `window.location.reload()` cannot run in jsdom, and both pages call it right
  // after a successful auth. Stub it so the redirect does not tear down the run.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: vi.fn(), assign: vi.fn() },
  });
});

afterEach(() => {
  // Without an explicit cleanup the DOM accumulates across cases, so
  // getByPlaceholderText finds matches from earlier renders.
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function fillRegister(user: ReturnType<typeof userEvent.setup>) {
  // Exact strings: /ramesh/i would match both the name and the email
  // placeholder, which throws "found multiple elements".
  await user.type(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Jane Doe');
  await user.type(screen.getByPlaceholderText('ramesh@example.com'), 'jane@example.com');
  await user.type(screen.getByPlaceholderText('At least 8 characters'), 'SecurePassword123!');
}

describe('Register flow', () => {
  it('stores tokens and the user on success, and omits untouched optional fields', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, TOKEN_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: /register & join/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    // Exactly the fields the backend schema declares. The phone field was left
    // blank, so it must not be sent as "" — EmailStr/pattern validators reject
    // empty strings with a 422 instead of treating them as absent.
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePassword123!',
    });

    await waitFor(() => expect(isAuthenticated()).toBe(true));
    expect(localStorage.getItem('townpulse_access_token')).toBe('access-token-abc');
    expect(JSON.parse(localStorage.getItem('townpulse_user') ?? '{}').email).toBe(
      'jane@example.com'
    );
  });

  it('surfaces a 409 conflict as readable text', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse(409, { detail: 'A user with this email already exists.' }))
    );

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: /register & join/i }));

    expect(await screen.findByText('A user with this email already exists.')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });

  it('renders a 422 validation array as prose, not a JSON blob', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          detail: [
            {
              loc: ['body', 'phone'],
              msg: 'String should match pattern ^\\+?[1-9]\\d{6,14}$',
              type: 'string_pattern_mismatch',
            },
          ],
        })
      )
    );

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await user.type(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('+919876543210'), '98765 43210');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'SecurePassword123!');
    await user.click(screen.getByRole('button', { name: /register & join/i }));

    const alert = await screen.findByText(/phone number/i, { selector: 'div' });
    expect(alert.textContent).not.toContain('"type"');
    expect(alert.textContent).not.toContain('[');
  });

  it('explains a rejected phone format without exposing the regex', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          detail: [
            {
              loc: ['body', 'phone'],
              msg: 'String should match pattern ^\\+?[1-9]\\d{6,14}$',
              type: 'string_pattern_mismatch',
            },
          ],
        })
      )
    );

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await user.type(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('+919876543210'), '98765 43210');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'SecurePassword123!');
    await user.click(screen.getByRole('button', { name: /register & join/i }));

    expect(
      await screen.findByText(/Phone number must be digits only/i)
    ).toBeInTheDocument();
  });

  it('blocks submission when neither email nor phone is given', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await user.type(screen.getByPlaceholderText('e.g. Ramesh Kumar'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'SecurePassword123!');
    await user.click(screen.getByRole('button', { name: /register & join/i }));

    expect(
      await screen.findByText(/enter an email address or a phone number/i)
    ).toBeInTheDocument();
    // Never reaches the API — the backend would answer 400 for this.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Login flow', () => {
  it('stores tokens on successful email login', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, TOKEN_RESPONSE)));

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'SecurePassword123!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(isAuthenticated()).toBe(true));
    expect(localStorage.getItem('townpulse_access_token')).toBe('access-token-abc');
  });

  it('shows the backend message on invalid credentials', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Invalid email or password' }))
    );

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'WrongPassword!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(isAuthenticated()).toBe(false);
  });
});