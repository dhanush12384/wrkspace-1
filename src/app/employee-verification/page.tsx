import { EmployeeVerificationApp } from '@/components/verification/employee-verification-app';
export const metadata = {
    title: 'Employee Verification Portal',
    description: 'Separate verification portal for public viewers, employees, and admins — general employee info, professional profiles, and full dossiers.',
};
export default function EmployeeVerificationPage() {
    return <EmployeeVerificationApp />;
}
