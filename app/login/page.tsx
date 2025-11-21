import type { Metadata } from 'next';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Login | Brown and Beatty Solutions | Labour Relations Software',
  description: 'Sign in to your Brown and Beatty Solutions account to access AI-powered labour relations and grievance management tools. Secure login for labour professionals.',
  keywords: 'login, sign in, Brown and Beatty Solutions, Brown and Beatty AI, labour relations software, grievance management login, secure access, authentication, labour law platform',
};

export default function LoginPage() {
  return <LoginForm />;
}
