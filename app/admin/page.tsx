import { redirect } from 'next/navigation';

export default function AdminRedirect() {
  redirect('/admin/master-schedule');
}
