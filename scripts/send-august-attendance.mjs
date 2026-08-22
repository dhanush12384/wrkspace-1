import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Resend } from 'resend';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../src/generated/prisma/index.js');

dotenv.config();

const p = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY || '');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAugustWorkingDates() {
    const dates = await p.attendance.findMany({
        where: { date: { startsWith: '2026-08' } },
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'asc' },
    });

    if (dates.length > 0) {
        return dates.map((d) => d.date);
    }

    const result = [];
    for (let day = 1; day <= 21; day++) {
        result.push(`2026-08-${String(day).padStart(2, '0')}`);
    }
    return result;
}

async function getEmployeeAugustData(employeeId, workingDates) {
    const employee = await p.employee.findUnique({
        where: { id: employeeId },
        select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            wingName: true,
        },
    });

    if (!employee) return null;

    const employeeLogs = await p.attendance.findMany({
        where: {
            employeeId,
            date: { startsWith: '2026-08' },
        },
        orderBy: { date: 'asc' },
    });

    const logMap = new Map();
    for (const log of employeeLogs) {
        logMap.set(log.date, log);
    }

    const records = [];
    let presentCount = 0;

    for (const dateStr of workingDates) {
        const d = new Date(`${dateStr}T12:00:00Z`);
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
        const log = logMap.get(dateStr);

        if (log) {
            const isPresent = log.status === 'Present' || log.status === 'Checked In';
            if (isPresent) presentCount++;

            records.push({
                date: dateStr,
                dayOfWeek,
                checkIn: log.checkIn || '-',
                checkOut: log.checkOut || '-',
                status: log.status || 'Present',
            });
        } else {
            records.push({
                date: dateStr,
                dayOfWeek,
                checkIn: '-',
                checkOut: '-',
                status: 'Absent',
            });
        }
    }

    const totalWorkingDays = workingDates.length;
    const absentDays = Math.max(0, totalWorkingDays - presentCount);
    const attendancePercentage =
        totalWorkingDays > 0 ? Number(((presentCount / totalWorkingDays) * 100).toFixed(1)) : 0;
    const isBelowSixty = attendancePercentage < 60;

    return {
        employee,
        stats: {
            totalWorkingDays,
            presentDays: presentCount,
            absentDays,
            attendancePercentage,
            isBelowSixty,
            records,
        },
    };
}

async function generateAugustPdf(data) {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const { employee, stats } = data;
    const fullName = `${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''} ${employee.lastName}`.trim();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    const page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text, x, currentY, options = {}) => {
        const size = options.size || 10;
        const font = options.font || helvetica;
        const color = options.color || rgb(0.1, 0.1, 0.1);
        page.drawText(text, { x, y: currentY, size, font, color });
    };

    const drawRect = (x, rectY, width, height, options = {}) => {
        page.drawRectangle({
            x,
            y: rectY,
            width,
            height,
            color: options.color,
            borderColor: options.borderColor,
            borderWidth: options.borderWidth || 0,
        });
    };

    // 1. Header Bar
    drawRect(margin, y - 50, contentWidth, 50, {
        color: rgb(0.06, 0.09, 0.16),
    });

    drawText('WRKSPACE SYSTEMS', margin + 14, y - 22, {
        size: 13,
        font: helveticaBold,
        color: rgb(1, 1, 1),
    });
    drawText('OFFICIAL MONTHLY ATTENDANCE STATEMENT', margin + 14, y - 38, {
        size: 9,
        font: helvetica,
        color: rgb(0.8, 0.85, 0.95),
    });

    drawText('MONTH: AUGUST 2026', pageWidth - margin - 150, y - 22, {
        size: 10,
        font: helveticaBold,
        color: rgb(0.9, 0.95, 1),
    });
    drawText('Date: 21 August 2026', pageWidth - margin - 150, y - 38, {
        size: 8.5,
        font: helvetica,
        color: rgb(0.7, 0.75, 0.85),
    });

    y -= 62;

    // 2. Employee Info Card
    drawRect(margin, y - 60, contentWidth, 60, {
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.88, 0.91, 0.94),
        borderWidth: 1,
    });

    drawText('EMPLOYEE NAME', margin + 12, y - 16, { size: 7.5, font: helveticaBold, color: rgb(0.4, 0.45, 0.5) });
    drawText(fullName, margin + 12, y - 29, { size: 10.5, font: helveticaBold, color: rgb(0.08, 0.12, 0.2) });
    drawText(`ID: ${employee.id}`, margin + 12, y - 44, { size: 8.5, font: helvetica, color: rgb(0.3, 0.35, 0.4) });

    const col2X = margin + 190;
    drawText('DEPARTMENT / ROLE', col2X, y - 16, { size: 7.5, font: helveticaBold, color: rgb(0.4, 0.45, 0.5) });
    drawText(employee.wingName || 'General', col2X, y - 29, { size: 9.5, font: helveticaBold, color: rgb(0.1, 0.15, 0.22) });
    drawText(employee.role || 'Employee', col2X, y - 44, { size: 8.5, font: helvetica, color: rgb(0.3, 0.35, 0.4) });

    const col3X = margin + 350;
    drawText('CONTACT EMAIL', col3X, y - 16, { size: 7.5, font: helveticaBold, color: rgb(0.4, 0.45, 0.5) });
    drawText(employee.email, col3X, y - 29, { size: 8.5, font: helvetica, color: rgb(0.1, 0.15, 0.22) });
    if (employee.phone) {
        drawText(`Ph: ${employee.phone}`, col3X, y - 44, { size: 8.5, font: helvetica, color: rgb(0.3, 0.35, 0.4) });
    }

    y -= 70;

    // 3. Summary Cards
    const cardGap = 8;
    const cardWidth = (contentWidth - cardGap * 3) / 4;
    const cardHeight = 44;

    const cards = [
        { label: 'AUGUST WORKING DAYS', val: `${stats.totalWorkingDays}`, color: rgb(0.2, 0.25, 0.35), bg: rgb(0.95, 0.96, 0.98) },
        { label: 'DAYS PRESENT', val: `${stats.presentDays}`, color: rgb(0.08, 0.5, 0.25), bg: rgb(0.93, 0.98, 0.94) },
        { label: 'DAYS ABSENT', val: `${stats.absentDays}`, color: rgb(0.7, 0.2, 0.2), bg: rgb(0.99, 0.94, 0.94) },
        {
            label: 'ATTENDANCE RATE',
            val: `${stats.attendancePercentage}%`,
            color: stats.isBelowSixty ? rgb(0.85, 0.1, 0.15) : rgb(0.08, 0.5, 0.25),
            bg: stats.isBelowSixty ? rgb(1, 0.92, 0.92) : rgb(0.93, 0.98, 0.94),
        },
    ];

    cards.forEach((c, idx) => {
        const cX = margin + idx * (cardWidth + cardGap);
        drawRect(cX, y - cardHeight, cardWidth, cardHeight, {
            color: c.bg,
            borderColor: rgb(0.85, 0.88, 0.92),
            borderWidth: 1,
        });
        drawText(c.label, cX + 8, y - 14, { size: 6.8, font: helveticaBold, color: rgb(0.4, 0.45, 0.5) });
        drawText(c.val, cX + 8, y - 34, { size: 14, font: helveticaBold, color: c.color });
    });

    y -= 54;

    // 4. Strict Action / Policy Notice Box
    const noticeHeight = stats.isBelowSixty ? 52 : 36;
    if (stats.isBelowSixty) {
        drawRect(margin, y - noticeHeight, contentWidth, noticeHeight, {
            color: rgb(0.99, 0.93, 0.93),
            borderColor: rgb(0.9, 0.2, 0.25),
            borderWidth: 1.5,
        });

        drawText('CRITICAL NOTICE - ATTENDANCE DEFICIT (< 60% MANDATORY THRESHOLD)', margin + 10, y - 14, {
            size: 8.5,
            font: helveticaBold,
            color: rgb(0.8, 0.1, 0.15),
        });

        const warningMsg1 = `Your attendance for August 2026 is currently ${stats.attendancePercentage}%, which is BELOW the mandatory minimum 60% requirement.`;
        const warningMsg2 = `Strict administrative and disciplinary action will be initiated if attendance is not immediately improved.`;
        drawText(warningMsg1, margin + 10, y - 27, { size: 8, font: helvetica, color: rgb(0.5, 0.1, 0.15) });
        drawText(warningMsg2, margin + 10, y - 40, { size: 8, font: helveticaBold, color: rgb(0.7, 0.08, 0.12) });
    } else {
        drawRect(margin, y - noticeHeight, contentWidth, noticeHeight, {
            color: rgb(0.94, 0.98, 0.95),
            borderColor: rgb(0.2, 0.65, 0.35),
            borderWidth: 1,
        });

        drawText('POLICY COMPLIANCE CONFIRMATION', margin + 10, y - 14, {
            size: 8.5,
            font: helveticaBold,
            color: rgb(0.1, 0.5, 0.25),
        });

        const okMsg = `Your August 2026 attendance is currently ${stats.attendancePercentage}%, complying with the company threshold of >= 60%.`;
        drawText(okMsg, margin + 10, y - 27, { size: 8, font: helvetica, color: rgb(0.15, 0.4, 0.2) });
    }

    y -= noticeHeight + 12;

    // 5. Attendance Table
    drawText('AUGUST 2026 DAILY ATTENDANCE BREAKDOWN', margin, y, {
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.12, 0.16, 0.25),
    });
    y -= 8;

    const rowHeight = 15;
    const colAlignX = [
        margin + 4,
        margin + 40,
        margin + 115,
        margin + 170,
        margin + 265,
        margin + 360,
        margin + 440,
    ];

    drawRect(margin, y - rowHeight, contentWidth, rowHeight, {
        color: rgb(0.15, 0.2, 0.3),
    });

    const headers = ['S.NO', 'DATE', 'DAY', 'CHECK-IN', 'CHECK-OUT', 'STATUS', 'REMARKS'];
    headers.forEach((h, i) => {
        drawText(h, colAlignX[i], y - 11, { size: 7, font: helveticaBold, color: rgb(1, 1, 1) });
    });

    y -= rowHeight;

    stats.records.forEach((rec, idx) => {
        const isPresent = rec.status === 'Present' || rec.status === 'Checked In';
        const isOdd = idx % 2 === 1;

        let rowBg = isOdd ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1);
        if (!isPresent) {
            rowBg = isOdd ? rgb(0.99, 0.95, 0.95) : rgb(1, 0.97, 0.97);
        }

        drawRect(margin, y - rowHeight, contentWidth, rowHeight, {
            color: rowBg,
            borderColor: rgb(0.9, 0.92, 0.95),
            borderWidth: 0.5,
        });

        drawText(String(idx + 1).padStart(2, '0'), colAlignX[0], y - 11, {
            size: 7.5,
            font: helvetica,
            color: rgb(0.4, 0.45, 0.5),
        });

        drawText(rec.date, colAlignX[1], y - 11, {
            size: 7.5,
            font: helveticaBold,
            color: rgb(0.15, 0.2, 0.25),
        });

        drawText(rec.dayOfWeek, colAlignX[2], y - 11, {
            size: 7.5,
            font: helvetica,
            color: rgb(0.3, 0.35, 0.4),
        });

        drawText(rec.checkIn, colAlignX[3], y - 11, {
            size: 7.5,
            font: helvetica,
            color: rec.checkIn !== '-' ? rgb(0.1, 0.4, 0.2) : rgb(0.6, 0.6, 0.6),
        });

        drawText(rec.checkOut, colAlignX[4], y - 11, {
            size: 7.5,
            font: helvetica,
            color: rec.checkOut !== '-' ? rgb(0.1, 0.4, 0.2) : rgb(0.6, 0.6, 0.6),
        });

        drawText(rec.status, colAlignX[5], y - 11, {
            size: 7.5,
            font: helveticaBold,
            color: isPresent ? rgb(0.08, 0.48, 0.22) : rgb(0.8, 0.15, 0.15),
        });

        const remark = isPresent ? 'Logged' : 'No Clock-in';
        drawText(remark, colAlignX[6], y - 11, {
            size: 7,
            font: helvetica,
            color: isPresent ? rgb(0.35, 0.4, 0.45) : rgb(0.7, 0.2, 0.2),
        });

        y -= rowHeight;
    });

    const footerY = margin + 10;
    page.drawLine({
        start: { x: margin, y: footerY + 18 },
        end: { x: pageWidth - margin, y: footerY + 18 },
        thickness: 0.8,
        color: rgb(0.85, 0.88, 0.92),
    });

    drawText(
        'This is a system-generated official statement from WrkSpace HR & Operations. Strict action policy applies to all employees with < 60% attendance.',
        margin,
        footerY + 8,
        { size: 6.8, font: helvetica, color: rgb(0.45, 0.5, 0.55) }
    );

    drawText(
        'Confidential | Generated via WrkSpace Attendance Portal | Page 1 of 1',
        margin,
        footerY - 2,
        { size: 6.5, font: helvetica, color: rgb(0.6, 0.65, 0.7) }
    );

    return await doc.save();
}

function generateEmail(data) {
    const { employee, stats } = data;
    const fullName = `${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''} ${employee.lastName}`.trim();

    const subject = stats.isBelowSixty
        ? `[STRICT ACTION NOTICE] August 2026 Attendance Statement - ${fullName} (${employee.id})`
        : `Official August 2026 Attendance Statement - ${fullName} (${employee.id})`;

    const text = `Dear ${fullName},

Please find attached your official Attendance Statement for the month of August 2026.

SUMMARY FOR AUGUST 2026:
- Total Working Days Evaluated: ${stats.totalWorkingDays}
- Days Present: ${stats.presentDays}
- Days Absent: ${stats.absentDays}
- Overall Attendance Percentage: ${stats.attendancePercentage}%

${
    stats.isBelowSixty
        ? `⚠️ IMPORTANT STRICT ACTION NOTICE:
Your current attendance for August 2026 is ${stats.attendancePercentage}%, which is BELOW the mandatory company threshold of 60.0%.
Please note that maintaining attendance below 60% is a violation of company policy and will attract STRICT ADMINISTRATIVE AND DISCIPLINARY ACTION, including performance warnings, review of monthly stipend/salary, and potential escalation.
You are required to improve your attendance immediately and contact HR if there are any discrepancies.`
        : `POLICY COMPLIANCE:
Your attendance for August 2026 is currently ${stats.attendancePercentage}%, which is compliant with the minimum 60% requirement. Note: All employees are strictly required to maintain >= 60% attendance every month.`
}

Your detailed day-by-day August attendance record is attached as a PDF (August_2026_Attendance_${employee.id}.pdf).

Best regards,
WrkSpace HR & Operations Management
support@app.redlix.co.in`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b; margin: 0 auto; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
        <img src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: inline-block;" />
      </div>

      <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.2px;">
        August 2026 Official Attendance Statement
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Dear <strong>${fullName}</strong> (ID: <code>${employee.id}</code>),
      </p>
      <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 16px;">
        Please review your individual attendance summary for <strong>August 2026</strong>. Your complete day-by-day attendance report has been compiled and attached as a PDF to this email.
      </p>

      <div style="margin: 20px 0;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 16px;">
          <tr>
            <td style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase;">Working Days</div>
              <div style="font-size: 20px; font-weight: 700; color: #1e293b; margin-top: 4px;">${stats.totalWorkingDays}</div>
            </td>
            <td style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
              <div style="font-size: 10px; font-weight: 600; color: #166534; text-transform: uppercase;">Present</div>
              <div style="font-size: 20px; font-weight: 700; color: #15803d; margin-top: 4px;">${stats.presentDays}</div>
            </td>
            <td style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
              <div style="font-size: 10px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Absent</div>
              <div style="font-size: 20px; font-weight: 700; color: #b91c1c; margin-top: 4px;">${stats.absentDays}</div>
            </td>
            <td style="background: ${stats.isBelowSixty ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${stats.isBelowSixty ? '#f87171' : '#86efac'}; border-radius: 8px; padding: 12px; text-align: center; width: 25%;">
              <div style="font-size: 10px; font-weight: 600; color: ${stats.isBelowSixty ? '#991b1b' : '#166534'}; text-transform: uppercase;">Attendance %</div>
              <div style="font-size: 20px; font-weight: 800; color: ${stats.isBelowSixty ? '#dc2626' : '#16a34a'}; margin-top: 4px;">${stats.attendancePercentage}%</div>
            </td>
          </tr>
        </table>
      </div>

      ${
          stats.isBelowSixty
              ? `
      <div style="background-color: #fff1f2; border: 1.5px solid #e11d48; border-radius: 8px; padding: 16px; margin: 18px 0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <strong style="font-size: 13.5px; color: #9f1239; text-transform: uppercase; letter-spacing: 0.3px;">
            ⚠️ Strict Disciplinary Action Notice (Attendance Below 60%)
          </strong>
        </div>
        <p style="font-size: 13px; line-height: 1.55; color: #881337; margin: 0 0 8px;">
          Your attendance for August 2026 is currently <strong>${stats.attendancePercentage}%</strong>, which is <strong>critically below the mandatory 60.0% threshold</strong>.
        </p>
        <p style="font-size: 12.5px; line-height: 1.5; color: #9f1239; margin: 0; font-weight: 600;">
          ⚠️ As per corporate regulations, failing to maintain minimum 60% monthly attendance will attract strict administrative and disciplinary actions, including performance warnings, review of monthly stipend/payouts, and potential reassessment of active status.
        </p>
        <p style="font-size: 12px; line-height: 1.4; color: #9f1239; margin: 8px 0 0;">
          You are advised to ensure immediate compliance for the remaining duration of the month and contact HR immediately for any regularization requests.
        </p>
      </div>
      `
              : `
      <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 14px; margin: 18px 0;">
        <strong style="font-size: 13px; color: #15803d;">✓ Attendance Policy Compliant</strong>
        <p style="font-size: 12.5px; line-height: 1.5; color: #166534; margin: 6px 0 0;">
          Your current attendance is <strong>${stats.attendancePercentage}%</strong> (>= 60%). Please note that maintaining at least 60% attendance every month is mandatory across all departments.
        </p>
      </div>
      `
      }

      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 12.5px; color: #475569;">
        📎 <strong>Attached Document:</strong> <code>August_2026_Attendance_${employee.id}.pdf</code> containing your complete date-wise check-in and check-out logs.
      </div>

      <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
        © 2026 WrkSpace Operations & HR Management. All rights reserved.<br/>
        This is an automated operational notification. For queries, reply to this email or contact the HR department.
      </div>
    </div>
    `;

    return { subject, text, html };
}

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const saveSample = args.includes('--save-sample-pdf');
    const empArg = args.find((a) => a.startsWith('--emp='));
    const targetEmpId = empArg ? empArg.split('=')[1] : null;

    console.log('=====================================================');
    console.log('   WRKSPACE AUGUST 2026 ATTENDANCE DISPATCH SYSTEM   ');
    console.log('=====================================================');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulation Only)' : 'LIVE DISPATCH'}`);
    if (targetEmpId) console.log(`Targeting single employee: ${targetEmpId}`);

    const workingDates = await getAugustWorkingDates();
    console.log(`Total August evaluated dates: ${workingDates.length} (${workingDates[0]} to ${workingDates[workingDates.length - 1]})`);

    const employees = await p.employee.findMany({
        where: targetEmpId ? { id: targetEmpId } : {},
        select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            wingName: true,
        },
        orderBy: { firstName: 'asc' },
    });

    console.log(`Found ${employees.length} employee(s) to process.\n`);

    let sent = 0;
    let failed = 0;
    let belowSixty = 0;
    let compliant = 0;

    for (const emp of employees) {
        const fullName = `${emp.firstName}${emp.middleName ? ' ' + emp.middleName : ''} ${emp.lastName}`.trim();

        try {
            const data = await getEmployeeAugustData(emp.id, workingDates);
            if (!data) {
                console.error(`❌ [${emp.id}] ${fullName}: No employee data found`);
                failed++;
                continue;
            }

            if (data.stats.isBelowSixty) {
                belowSixty++;
            } else {
                compliant++;
            }

            const pdfBytes = await generateAugustPdf(data);
            const pdfBuffer = Buffer.from(pdfBytes);
            const email = generateEmail(data);

            if (saveSample) {
                const samplePath = path.join(__dirname, `../August_2026_Attendance_${emp.id}.pdf`);
                fs.writeFileSync(samplePath, pdfBuffer);
                console.log(`💾 Saved sample PDF to: ${samplePath}`);
            }

            if (isDryRun) {
                console.log(
                    `[DRY-RUN] [${emp.id}] ${fullName.padEnd(26)} | Email: ${emp.email.padEnd(32)} | Present: ${String(data.stats.presentDays).padStart(2)}/${data.stats.totalWorkingDays} | Att: ${String(data.stats.attendancePercentage).padStart(5)}% | ${data.stats.isBelowSixty ? '⚠️ DEFICIT (<60%)' : '✓ COMPLIANT'}`
                );
                sent++;
            } else {
                process.stdout.write(`Sending to [${emp.id}] ${fullName} (${emp.email})... `);
                const sendRes = await resend.emails.send({
                    from: 'WrkSpace Attendance <support@app.redlix.co.in>',
                    to: emp.email,
                    subject: email.subject,
                    text: email.text,
                    html: email.html,
                    attachments: [
                        {
                            filename: `August_2026_Attendance_${emp.id}.pdf`,
                            content: pdfBuffer.toString('base64'),
                        },
                    ],
                });

                if (sendRes.error) {
                    throw new Error(sendRes.error.message || 'Resend error');
                }
                console.log(`✓ Sent (ID: ${sendRes.data?.id})`);
                sent++;
            }
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
            failed++;
        }
    }

    console.log('\n=====================================================');
    console.log('                 DISPATCH SUMMARY                    ');
    console.log('=====================================================');
    console.log(`Total Employees Processed: ${employees.length}`);
    console.log(`Successfully Processed:    ${sent}`);
    console.log(`Failed:                    ${failed}`);
    console.log(`Below 60% Attendance:      ${belowSixty} (Strict Notice Applied)`);
    console.log(`Compliant (>= 60%):        ${compliant}`);
    console.log('=====================================================\n');

    await p.$disconnect();
}

main().catch(async (e) => {
    console.error('Fatal error in script:', e);
    await p.$disconnect();
    process.exit(1);
});
