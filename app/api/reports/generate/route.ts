import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma'; 
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'; 
import ExcelJS from 'exceljs';

interface ReportParams {
  type: 'all_assets' | 'asset_assignments' | 'asset_status_summary';
  format: 'word' | 'pdf' | 'excel';
  orgId: string;
  statusFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. AI features will be impacted.");
}
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash"}) : null;

const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function POST(req: Request) {
  try {
    console.log('[API /api/reports/generate] Received request');
    const { userId, orgId: orgIdFromAuth } = auth();
    const params: ReportParams = await req.json();

    const currentOrgId = params.orgId; 

    if (!currentOrgId) {
      return new NextResponse(JSON.stringify({ message: 'Organization ID is required.' }), { status: 400 });
    }
    console.log(`[API /api/reports/generate] Generating report for orgId: ${currentOrgId}, type: ${params.type}, format: ${params.format}`);

    let organizationName = 'Your Organization'; 
    try {
      const org = await clerkClient.organizations.getOrganization({ organizationId: currentOrgId });
      organizationName = org.name || organizationName;
    } catch (error) {
      console.warn(`[API /api/reports/generate] Could not fetch organization name for ${currentOrgId}:`, error);
    }

    let data: any[] | Record<string, any> = [];
    let geminiPrompt = '';
    const filters: any = {};
    if (params.statusFilter) filters.status = params.statusFilter; 
    if (params.dateFrom || params.dateTo) {
      filters.createdAt = {};
      if (params.dateFrom) filters.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) filters.createdAt.lte = new Date(params.dateTo);
    }

    switch (params.type) {
      case 'all_assets':
        data = await prisma.asset.findMany({
          where: { clerkOrganizationId: currentOrgId, ...filters }, 
          include: { assignedTo: true }, 
        });
        geminiPrompt = `Analyze the following complete asset list for ${organizationName}. Provide key insights on asset distribution, status overview, and potential areas for optimization or concern based on this data:\n\n${JSON.stringify(data.map((a:any) => ({ name: a.name, status: a.status, assignedTo: a.assignedTo?.firstName + ' ' + a.assignedTo?.lastName })), null, 2)}`;
        break;
      case 'asset_assignments':
        data = await prisma.asset.findMany({
          where: {
            clerkOrganizationId: currentOrgId, 
            assignedToClerkUserId: { not: null }, 
            ...filters
          },
          include: { assignedTo: true, assignmentHistory: { orderBy: { assignedAt: 'desc' }, take: 1 } },
        });
        geminiPrompt = `Analyze the asset assignment data for ${organizationName}. Focus on assignment patterns, utilization, and identify any assets that might be over/under-utilized or assigned to users who might not need them. Data:\n\n${JSON.stringify(data.map((a:any) => ({ name: a.name, assignedTo: a.assignedTo?.firstName + ' ' + a.assignedTo?.lastName, status: a.status, lastAssigned: a.assignmentHistory[0]?.assignedAt })), null, 2)}`;
        break;
      case 'asset_status_summary':
        const summary = await prisma.asset.groupBy({
          by: ['status'], 
          where: { 
            clerkOrganizationId: currentOrgId, 
            ...(params.statusFilter ? { status: params.statusFilter } : {}) 
          },
          _count: { id: true }, 
        });
        data = summary.reduce((acc, curr) => { 
          acc[curr.status] = curr._count.id; 
          return acc;
        }, {} as Record<string, any>);
        geminiPrompt = `Analyze this asset status summary for ${organizationName}. Provide insights into the distribution of assets across different statuses and highlight any potential issues or areas needing attention based on these counts:\n\n${JSON.stringify(data, null, 2)}`;
        break;
      default:
        return new NextResponse(JSON.stringify({ message: 'Invalid report type' }), { status: 400 });
    }

    let aiAnalysisText = "AI analysis could not be generated or is disabled.";
    if (model && geminiPrompt) {
      try {
        console.log(`[API /api/reports/generate] Sending prompt to Gemini for ${params.type}`);
        const result = await model.generateContentStream([{ text: geminiPrompt }], { generationConfig, safetySettings });
        let textResponse = ""; 
        for await (const chunk of result.stream) { 
            textResponse += chunk.text(); 
        }
        aiAnalysisText = textResponse.trim() || "AI analysis completed, but no specific observations were returned.";
        console.log(`[API /api/reports/generate] Gemini analysis received for ${params.type}`);
      } catch (geminiError) {
        console.error("[API /api/reports/generate] Error calling Gemini API:", geminiError);
        aiAnalysisText = "Error occurred while generating AI analysis. Please check server logs.";
      }
    } else if (!model) {
      console.warn("[API /api/reports/generate] Gemini model not initialized. Skipping AI analysis.");
    }

    let fileBuffer: Buffer;
    let contentType: string;
    const reportTitleText = `${params.type.replace(/_/g, ' ').toUpperCase()} REPORT`;
    const generatedDateText = new Date().toLocaleDateString();
    const orgNameSlug = (organizationName || 'organization').toLowerCase().replace(/\s+/g, '_');
    let filename = `${orgNameSlug}_${params.type}_report_${new Date().toISOString().split('T')[0]}`;

    switch (params.format) {
      case 'word':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename += '.docx';
        const docChildren = [
          new Paragraph({ text: reportTitleText, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `Organization: ${organizationName}` }),
          new Paragraph({ text: `Generated on: ${generatedDateText}` }),
          new Paragraph({ text: "AI Analysis:", heading: HeadingLevel.HEADING_1 }),
          new Paragraph(aiAnalysisText),
          new Paragraph({ text: "Data:", heading: HeadingLevel.HEADING_1 }),
        ];
        if (params.type === 'asset_assignments' && Array.isArray(data) && data.length > 0) {
          const tableRows = [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Asset Name")] }),
                new TableCell({ children: [new Paragraph("Serial Number")] }),
                new TableCell({ children: [new Paragraph("Status")] }),
                new TableCell({ children: [new Paragraph("Assigned To")] }),
                new TableCell({ children: [new Paragraph("Assignment Date")] }),
              ],
            }),
            ...data.map((item: any) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.name || 'N/A')] }),
                new TableCell({ children: [new Paragraph(item.serialNumber || 'N/A')] }),
                new TableCell({ children: [new Paragraph(item.status || 'N/A')] }),
                new TableCell({ children: [new Paragraph(item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : (item.customAssignedTo || 'Unassigned'))] }),
                new TableCell({ children: [new Paragraph(item.assignmentHistory?.[0]?.assignedAt ? new Date(item.assignmentHistory[0].assignedAt).toLocaleDateString() : 'N/A')] }),
              ],
            })),
          ];
          docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        } else {
          docChildren.push(new Paragraph(JSON.stringify(data, null, 2)));
        }
        const doc = new Document({ sections: [{ children: docChildren }] });
        fileBuffer = await Packer.toBuffer(doc);
        break;

      case 'pdf':
        contentType = 'application/pdf';
        filename += '.pdf';
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage(PageSizes.A4);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 10;
        const margin = 50;
        let y = height - margin;

        const drawTextLine = (text: string, f = font, size = fontSize, color = rgb(0,0,0), spacing = 3) => {
          // Sanitize the input text: normalize all newlines (CRLF, LF) to LF, then replace LF with a space.
          const txt = String(text).replace(/\r\n/g, '\n').replace(/\n/g, ' ');
          const lines = [];
          let currentLine = txt;
          while (f.widthOfTextAtSize(currentLine, size) > width - 2 * margin) {
            let breakPoint = currentLine.length;
            while (f.widthOfTextAtSize(currentLine.substring(0, breakPoint), size) > width - 2 * margin && breakPoint > 0) {
              breakPoint--;
            }
            let actualBreakPoint = currentLine.substring(0, breakPoint).lastIndexOf(' ');
            if (actualBreakPoint <= 0) actualBreakPoint = breakPoint; 
            lines.push(currentLine.substring(0, actualBreakPoint));
            currentLine = currentLine.substring(actualBreakPoint).trimStart();
          }
          lines.push(currentLine);
          for (const line of lines) {
            if (y < margin + size) { page = pdfDoc.addPage(PageSizes.A4); y = height - margin; }
            page.drawText(line, { x: margin, y, font: f, size, color });
            y -= (size + spacing);
          }
          return y;
        };

        y = drawTextLine(reportTitleText, boldFont, 18, rgb(0,0,0), 10);
        y = drawTextLine(`Organization: ${organizationName}`, font, 12, rgb(0.2,0.2,0.2), 5);
        y = drawTextLine(`Generated on: ${generatedDateText}`, font, 12, rgb(0.2,0.2,0.2), 10);
        
        y = drawTextLine("AI Analysis:", boldFont, 14, rgb(0,0,0), 5);
        y = drawTextLine(aiAnalysisText, font, fontSize, rgb(0.3,0.3,0.3), 3);
        y -= 10; 

        y = drawTextLine("Data:", boldFont, 14, rgb(0,0,0), 5);
        const dataString = JSON.stringify(data, null, 2);
        y = drawTextLine(dataString, font, 8, rgb(0.4,0.4,0.4), 2);

        const pdfBytes = await pdfDoc.save();
        fileBuffer = Buffer.from(pdfBytes);
        break;

      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename += '.xlsx';
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        let currentRow = 1;

        worksheet.getCell(currentRow, 1).value = reportTitleText;
        worksheet.getCell(currentRow, 1).font = { size: 16, bold: true };
        currentRow++;
        worksheet.getCell(currentRow, 1).value = `Organization: ${organizationName}`;
        currentRow++;
        worksheet.getCell(currentRow, 1).value = `Generated on: ${generatedDateText}`;
        currentRow += 2;

        worksheet.getCell(currentRow, 1).value = "AI Analysis:";
        worksheet.getCell(currentRow, 1).font = { bold: true };
        currentRow++;
        const analysisCell = worksheet.getCell(currentRow, 1);
        analysisCell.value = aiAnalysisText;
        analysisCell.alignment = { wrapText: true };
        const analysisLines = aiAnalysisText.split('\n').length;
        const numChars = aiAnalysisText.length;
        const estimatedRowsForAnalysis = Math.max(analysisLines, Math.ceil(numChars / 80)); 
        worksheet.getRow(currentRow).height = estimatedRowsForAnalysis * 15; 
        currentRow += 2; 

        worksheet.getCell(currentRow, 1).value = "Data:";
        worksheet.getCell(currentRow, 1).font = { bold: true };
        currentRow++;

        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0] || {}).map(header => 
            header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
          );
          worksheet.getRow(currentRow).values = headers;
          worksheet.getRow(currentRow).font = { bold: true };
          currentRow++;
          data.forEach((item: any) => {
            const rowValues = Object.values(item).map(val => {
              if (val instanceof Date) return val.toLocaleDateString();
              if (typeof val === 'object' && val !== null) return JSON.stringify(val);
              return val;
            });
            worksheet.addRow(rowValues);
          });
        } else if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
          Object.entries(data).forEach(([key, value]) => {
            worksheet.addRow([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), value]);
          });
        } else {
          worksheet.getCell(currentRow, 1).value = "No data available.";
        }
        
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell!({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? String(cell.value).length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
        });

        fileBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
        break;

      default:
        console.error(`[API /api/reports/generate] Invalid report format: ${params.format}`);
        return new NextResponse(JSON.stringify({ message: 'Invalid report format specified.' }), { status: 400 });
    }

    console.log(`[API /api/reports/generate] Sending file: ${filename}, Type: ${contentType}, Size: ${fileBuffer.length} bytes`);
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(fileBuffer, { status: 200, headers: responseHeaders });

  } catch (error: any) {
    console.error('[API /api/reports/generate] Error generating report:', error);
    return new NextResponse(JSON.stringify({ message: 'Failed to generate report', error: error.message }), { status: 500 });
  }
}