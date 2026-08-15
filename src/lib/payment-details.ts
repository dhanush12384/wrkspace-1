export function isPaymentDetailsComplete(emp: {
    upiId?: string | null;
    bankAccountHolderName?: string | null;
    bankAccountNumber?: string | null;
    bankName?: string | null;
    bankIfsc?: string | null;
}) {
    const upi = String(emp?.upiId || '').trim();
    if (upi)
        return true;
    const holder = String(emp?.bankAccountHolderName || '').trim();
    const acct = String(emp?.bankAccountNumber || '').trim();
    const bank = String(emp?.bankName || '').trim();
    const ifsc = String(emp?.bankIfsc || '').trim();
    return Boolean(holder && acct && bank && ifsc);
}
export function paymentFieldsForPublic(emp: {
    stipendAmount?: number | null;
    upiId?: string | null;
    bankAccountHolderName?: string | null;
    bankAccountNumber?: string | null;
    bankName?: string | null;
    bankIfsc?: string | null;
    paymentDetailsFilledAt?: Date | string | null;
}) {
    return {
        stipendAmount: emp.stipendAmount ?? null,
        upiId: emp.upiId ?? null,
        bankAccountHolderName: emp.bankAccountHolderName ?? null,
        bankAccountNumber: emp.bankAccountNumber ?? null,
        bankName: emp.bankName ?? null,
        bankIfsc: emp.bankIfsc ?? null,
        paymentDetailsFilledAt: emp.paymentDetailsFilledAt ?? null,
        paymentDetailsComplete: isPaymentDetailsComplete(emp),
    };
}
export function parseEmployeePaymentBody(body: Record<string, unknown>, alreadyComplete: boolean): {
    data: Record<string, unknown>;
} | {
    error: string;
    status: number;
} {
    if (alreadyComplete) {
        return { error: 'Payment details already on file', status: 409 };
    }
    const upiId = body?.upiId != null ? String(body.upiId).trim().slice(0, 120) : '';
    const bankAccountHolderName = body?.bankAccountHolderName != null
        ? String(body.bankAccountHolderName).trim().slice(0, 120)
        : '';
    const bankAccountNumber = body?.bankAccountNumber != null ? String(body.bankAccountNumber).trim().slice(0, 40) : '';
    const bankAccountNumberConfirm = body?.bankAccountNumberConfirm != null
        ? String(body.bankAccountNumberConfirm).trim().slice(0, 40)
        : '';
    const bankName = body?.bankName != null ? String(body.bankName).trim().slice(0, 120) : '';
    const bankIfsc = body?.bankIfsc != null ? String(body.bankIfsc).trim().toUpperCase().slice(0, 20) : '';
    if (upiId) {
        return {
            data: {
                upiId,
                paymentDetailsFilledAt: new Date(),
            },
        };
    }
    if (bankAccountNumber || bankName || bankIfsc || bankAccountHolderName) {
        if (!bankAccountHolderName) {
            return { error: 'Account holder name is required (exact name as in bank)', status: 400 };
        }
        if (!bankAccountNumber || !bankName || !bankIfsc) {
            return { error: 'Account number, bank name, and IFSC are required', status: 400 };
        }
        if (!bankAccountNumberConfirm) {
            return { error: 'Please re-enter account number to confirm', status: 400 };
        }
        if (bankAccountNumber !== bankAccountNumberConfirm) {
            return { error: 'Account numbers do not match', status: 400 };
        }
        return {
            data: {
                bankAccountHolderName,
                bankAccountNumber,
                bankName,
                bankIfsc,
                paymentDetailsFilledAt: new Date(),
            },
        };
    }
    return {
        error: 'Provide UPI ID, or account holder name + account number (twice) + bank name + IFSC',
        status: 400,
    };
}
