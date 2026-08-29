import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/finance/decimal";
import type { CurrencySummary } from "@/lib/finance/reports";

export interface PDFExportData {
  transactions: any[];
  summaryByCurrency: { [currency: string]: CurrencySummary };
  totalCount: number;
  dateRangeLabel: string;
  appliedFilters: {
    type?: string;
    categoryName?: string;
    accountName?: string;
    searchQuery?: string;
  };
  accountsMap: Map<string, { name: string; currency: string; type?: string }>;
  categoriesMap: Map<string, string>;
  peopleMap: Map<string, string>;
}

export function generateFinancialReportPDF(data: PDFExportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // 1. BRAND & HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27); // zinc-900
  doc.text("MY QIAN", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122); // zinc-500
  const nowStr = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated on: ${nowStr}`, pageWidth - 14, currentY, { align: "right" });

  currentY += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(39, 39, 42); // zinc-800
  doc.text("Financial Statement & Transaction Report", 14, currentY);

  currentY += 8;

  // 2. APPLIED FILTERS BOX
  doc.setDrawColor(228, 228, 231); // zinc-200
  doc.setFillColor(250, 250, 250); // zinc-50
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text("APPLIED FILTERS", 18, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);

  const filterParts = [
    `Date Range: ${data.dateRangeLabel}`,
    `Type: ${data.appliedFilters.type || "All"}`,
    `Category: ${data.appliedFilters.categoryName || "All"}`,
    `Account: ${data.appliedFilters.accountName || "All"}`,
  ];
  if (data.appliedFilters.searchQuery) {
    filterParts.push(`Search: "${data.appliedFilters.searchQuery}"`);
  }

  doc.text(filterParts.slice(0, 3).join("   •   "), 18, currentY + 10);
  if (filterParts.length > 3) {
    doc.text(filterParts.slice(3).join("   •   "), 18, currentY + 15);
  }

  currentY += 24;

  // 3. CURRENCY-SEPARATED FINANCIAL SUMMARY
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(`Summary by Currency (${data.totalCount} matching transactions)`, 14, currentY);

  currentY += 3;

  const summaryRows = Object.values(data.summaryByCurrency).map((item) => {
    return [
      item.currency,
      formatCurrency(item.income, item.currency),
      formatCurrency(item.expenses, item.currency),
      formatCurrency(item.transfers, item.currency),
      formatCurrency(item.net, item.currency),
      String(item.count),
    ];
  });

  if (summaryRows.length === 0) {
    summaryRows.push(["—", "¥0.00", "¥0.00", "¥0.00", "¥0.00", "0"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Currency", "Income", "Expenses", "Transfers/Other", "Net Position", "Count"]],
    body: summaryRows,
    theme: "grid",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [228, 228, 231],
      lineWidth: 0.2,
      textColor: [39, 39, 42],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 22 },
      1: { textColor: [22, 101, 52] }, // emerald
      2: { textColor: [153, 27, 27] }, // red
      3: { textColor: [71, 85, 105] }, // slate
      4: { fontStyle: "bold" },
      5: { halign: "center", cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. TRANSACTIONS LEDGER TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text("Transaction Ledger", 14, currentY);

  currentY += 3;

  const tableRows = data.transactions.map((tx) => {
    // Resolve Category
    const parentCat = tx.parentCategoryId ? data.categoriesMap.get(tx.parentCategoryId) : null;
    const childCat = tx.childCategoryId ? data.categoriesMap.get(tx.childCategoryId) : null;
    const categoryName =
      parentCat && childCat
        ? `${parentCat} > ${childCat}`
        : parentCat || childCat || "—";

    // Resolve Accounts & Channel
    const srcAcc = tx.sourceAccountId ? data.accountsMap.get(tx.sourceAccountId) : null;
    const destAcc = tx.destinationAccountId ? data.accountsMap.get(tx.destinationAccountId) : null;
    let accountDisplay = "—";
    if (srcAcc && destAcc) {
      accountDisplay = `${srcAcc.name} → ${destAcc.name}`;
    } else if (srcAcc) {
      accountDisplay = srcAcc.name;
    } else if (destAcc) {
      accountDisplay = destAcc.name;
    }

    // Resolve Person
    const personName = tx.personId ? data.peopleMap.get(tx.personId) || "—" : "—";

    // Format Amount
    const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
    const rawAmt = tx.type === "income" ? (tx.destinationAmount || tx.sourceAmount || "0") : (tx.sourceAmount || tx.destinationAmount || "0");
    let formattedAmount = formatCurrency(rawAmt, curr);
    if (tx.type === "expense") {
      formattedAmount = `-${formattedAmount}`;
    } else if (tx.type === "income") {
      formattedAmount = `+${formattedAmount}`;
    }

    const typeName = tx.type.replace("_", " ").toUpperCase();

    const titleWithNote = tx.note ? `${tx.title}\n(${tx.note})` : tx.title;

    return [
      tx.transactionDate || "—",
      typeName,
      titleWithNote,
      categoryName,
      accountDisplay,
      personName,
      formattedAmount,
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(["—", "—", "No transactions found", "—", "—", "—", "—"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Date", "Type", "Title / Note", "Category", "Account / Source", "Person", "Amount"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      overflow: "linebreak",
      lineColor: [240, 240, 240],
      lineWidth: 0.1,
      textColor: [39, 39, 42],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 18, fontStyle: "bold" },
      2: { cellWidth: 44 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20 },
      6: { halign: "right", fontStyle: "bold", cellWidth: 22 },
    },
    didParseCell: (dataCell) => {
      if (dataCell.section === "body" && dataCell.column.index === 6) {
        const textVal = String(dataCell.cell.raw);
        if (textVal.startsWith("+")) {
          dataCell.cell.styles.textColor = [22, 101, 52]; // Green
        } else if (textVal.startsWith("-")) {
          dataCell.cell.styles.textColor = [153, 27, 27]; // Red
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. FOOTER & PAGE NUMBERING
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(
      `Page ${i} of ${pageCount}  •  My Qian Finance Console`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // Save the PDF file
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`MyQian_Financial_Report_${dateStr}.pdf`);
}
