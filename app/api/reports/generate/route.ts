import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
// For Gemini (Install the SDK: npm install @google/generative-ai)
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// For specific file generation, you'd use libraries like:
// PDF: 'pdf-lib' or 'puppeteer' (for HTML to PDF)
// Word: 'docx'
// Excel: 'exceljs'

type ReportFormat = "pdf" | "word" | "excel";
type ReportType = "all_assets" | "asset_assignments" | "asset_status_summary";

interface ReportParams {
format: ReportFormat;
type: ReportType;
dateFrom?: string;
dateTo?: string;
statusFilter?: string;
}

// --- Gemini API Setup (Placeholder) ---
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// let genAI: GoogleGenerativeAI | null = null;
// if (GEMINI_API_KEY) {
// genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// } else {
// console.warn("GEMINI_API_KEY is not set. Report generation with Gemini will be unavailable.");
// }

// const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred model

// const generationConfig = {
// temperature: 0.9, // Adjust as needed
// topK: 1,
// topP: 1,
// maxOutputTokens: 8192, // Adjust as needed
// };
// const safetySettings = [
// { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
// // ... other safety settings
// ];
// --- End Gemini Setup ---

export async function POST(req: Request) {
try {
const { userId, orgId, orgRole } = auth();
console.log('[API /api/reports/generate] Auth details:', { userId, orgId, orgRole }); // DEBUG LOG

if (!userId || !orgId) {
console.error('[API /api/reports/generate] Unauthorized access attempt or no orgId. UserId:', userId, 'OrgId:', orgId);
return new NextResponse(JSON.stringify({ message: 'Unauthorized or no organization selected' }), { status: 401 });
}

const params: ReportParams = await req.json();

// 1. Fetch Data from Prisma based on params.type and filters
let data: any;
const whereClause: any = { clerkOrganizationId: orgId };

if (params.dateFrom || params.dateTo) {
  whereClause.createdAt = {};
  if (params.dateFrom) {
    whereClause.createdAt.gte = new Date(params.dateFrom);
  }
  if (params.dateTo) {
    // To include the whole 'dateTo' day, set time to end of day
    const endDate = new Date(params.dateTo);
    endDate.setHours(23, 59, 59, 999);
    whereClause.createdAt.lte = endDate;
  }
}

if (params.statusFilter) {
  whereClause.status = params.statusFilter;
}

switch (params.type) {
  case 'all_assets':
    data = await prisma.asset.findMany({
      where: whereClause,
      include: { assignedTo: true },
      orderBy: { title: 'asc' }
    });
    break;
  case 'asset_assignments':
    // For asset_assignments, we also need to ensure assignedToClerkUserId is not null
    const assignmentWhereClause = { 
      ...whereClause, 
      assignedToClerkUserId: { not: null } 
    };
    data = await prisma.asset.findMany({
        where: assignmentWhereClause,
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true }} },
        orderBy: { assignedTo: { firstName: 'asc' } } // Note: orderBy on relation might need adjustment based on DB
    });
    break;
  case 'asset_status_summary':
     const statusCounts = await prisma.asset.groupBy({
        by: ['status'],
        where: whereClause, // Apply date and other filters here too
        _count: { status: true },
    });
    data = statusCounts.map(item => ({ status: item.status, count: item._count.status }));
    break;
  default:
    return new NextResponse(JSON.stringify({ message: 'Invalid report type' }), { status: 400 });
}

if (!data || (Array.isArray(data) && data.length === 0)) {
    return new NextResponse(JSON.stringify({ message: 'No data found for the selected report criteria.' }), { status: 404 });
}

// 2. Generate Report File (Placeholder for actual file generation)
// This is where you would use Gemini or specific file libraries.

let fileBuffer: Buffer;
let contentType: string;
let filename = `${params.type}_report_${new Date().toISOString().split('T')[0]}`;

// --- Placeholder for Gemini/Library Integration ---
if (params.format === "pdf") {
  contentType = "application/pdf";
  filename += ".pdf";
  // Example: Using a library or Gemini to generate PDF content into fileBuffer
  // For Gemini:
  // if (!model) return new NextResponse(JSON.stringify({ message: "Gemini AI model not initialized."}), { status: 500});
  // const prompt = `Generate a PDF report for the following asset data: ${JSON.stringify(data)}. Columns should be ... Summary should be ...`;
  // const result = await model.generateContentStream([{ text: prompt }]); // Or generateContent for single response
  // let textResponse = ""; for await (const chunk of result.stream) { textResponse += chunk.text(); }
  // fileBuffer = Buffer.from(textResponse); // This assumes Gemini returns base64 or similar PDF content. 
  // This part is HIGHLY dependent on Gemini's capabilities for direct file generation or structured content that you then convert.
  // Most likely, Gemini will give you text/markdown, and you use another library to make a PDF.
  fileBuffer = Buffer.from(`This is a placeholder PDF report for ${params.type} with data: ${JSON.stringify(data, null, 2)}`); // Placeholder
} else if (params.format === "excel") {
  contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  filename += ".xlsx";
  // Example with 'exceljs' (you'd need to install and implement)
  // const workbook = new ExcelJS.Workbook();
  // const worksheet = workbook.addWorksheet('Assets');
  // // ... populate worksheet with data ...
  // fileBuffer = await workbook.xlsx.writeBuffer() as Buffer;
  fileBuffer = Buffer.from(`This is a placeholder Excel report for ${params.type}. Data: ${JSON.stringify(data, null, 2)}`); // Placeholder
} else if (params.format === "word") {
  contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  filename += ".docx";
  // Example with 'docx' library
  fileBuffer = Buffer.from(`This is a placeholder Word report for ${params.type}. Data: ${JSON.stringify(data, null, 2)}`); // Placeholder
} else {
  return new NextResponse(JSON.stringify({ message: 'Invalid report format' }), { status: 400 });
}
// --- End Placeholder ---

const responseHeaders = new Headers();
responseHeaders.set('Content-Type', contentType);
responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

return new NextResponse(fileBuffer, {
  status: 200,
  headers: responseHeaders,
});
} catch (error: any) {
console.error('[REPORTS_GENERATE_POST]', error);
return new NextResponse(JSON.stringify({ message: error.message || 'Internal Server Error' }), { status: 500 });
}
}