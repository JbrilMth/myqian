import ExcelJS from "exceljs";
import { formatCurrency } from "@/lib/finance/decimal";
import type { CurrencySummary } from "@/lib/finance/reports";

export interface ExcelExportData {
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

export async function generateTransactionsExcel(data: ExcelExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "My Qian";
  workbook.lastModifiedBy = "My Qian User";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Transactions Report", {
    views: [{ showGridLines: true }],
  });

  // 1. TITLE ROW
  const titleRow = worksheet.addRow(["MY QIAN — FINANCIAL & TRANSACTION REPORT"]);
  titleRow.font = { bold: true, size: 14, color: { argb: "FF18181B" } };
  worksheet.addRow([]);

  // 2. METADATA & FILTERS
  const metaRows = [
    ["Report Date:", new Date().toLocaleString()],
    ["Date Range:", data.dateRangeLabel],
    ["Type Filter:", data.appliedFilters.type || "All"],
    ["Category Filter:", data.appliedFilters.categoryName || "All"],
    ["Account Filter:", data.appliedFilters.accountName || "All"],
    ["Search Query:", data.appliedFilters.searchQuery ? `"${data.appliedFilters.searchQuery}"` : "None"],
    ["Matching Transactions:", data.totalCount],
  ];

  metaRows.forEach(([k, v]) => {
    const row = worksheet.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 9, color: { argb: "FF71717A" } };
    row.getCell(2).font = { size: 9, color: { argb: "FF18181B" } };
  });

  worksheet.addRow([]);

  // 3. CURRENCY SUMMARY TABLE
  const summaryHeaderRow = worksheet.addRow([
    "Currency",
    "Total Income",
    "Total Expenses",
    "Transfers / Other",
    "Net Position",
    "Count",
  ]);

  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3F3F46" }, // zinc-700
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE4E4E7" } },
      bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
      left: { style: "thin", color: { argb: "FFE4E4E7" } },
      right: { style: "thin", color: { argb: "FFE4E4E7" } },
    };
  });

  Object.values(data.summaryByCurrency).forEach((s) => {
    const r = worksheet.addRow([
      s.currency,
      Number(s.income),
      Number(s.expenses),
      Number(s.transfers),
      Number(s.net),
      s.count,
    ]);

    r.getCell(1).font = { bold: true, size: 9 };
    r.getCell(1).alignment = { horizontal: "center" };

    // Format numbers
    [2, 3, 4, 5].forEach((colIdx) => {
      const cell = r.getCell(colIdx);
      cell.numFmt = '#,##0.00;[Red]-#,##0.00;"0.00"';
      cell.font = { size: 9 };
    });

    r.getCell(6).alignment = { horizontal: "center" };
    r.getCell(6).font = { size: 9 };

    r.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE4E4E7" } },
        bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
        left: { style: "thin", color: { argb: "FFE4E4E7" } },
        right: { style: "thin", color: { argb: "FFE4E4E7" } },
      };
    });
  });

  worksheet.addRow([]);
  worksheet.addRow([]);

  // 4. TRANSACTIONS TABLE
  const txHeaderRow = worksheet.addRow([
    "Date",
    "Time",
    "Type",
    "Title",
    "Parent Category",
    "Child Category",
    "Full Category",
    "Amount",
    "Currency",
    "Source Account",
    "Destination Account",
    "Payment Channel",
    "Person",
    "Person Transfer Type",
    "Note",
  ]);

  txHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF18181B" }, // zinc-900
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF27272A" } },
      bottom: { style: "thin", color: { argb: "FF27272A" } },
      left: { style: "thin", color: { argb: "FF27272A" } },
      right: { style: "thin", color: { argb: "FF27272A" } },
    };
  });

  data.transactions.forEach((tx, index) => {
    const parentCat = tx.parentCategoryId ? data.categoriesMap.get(tx.parentCategoryId) || "" : "";
    const childCat = tx.childCategoryId ? data.categoriesMap.get(tx.childCategoryId) || "" : "";
    const fullCat =
      parentCat && childCat
        ? `${parentCat} > ${childCat}`
        : parentCat || childCat || "";

    const srcAcc = tx.sourceAccountId ? data.accountsMap.get(tx.sourceAccountId)?.name || "" : "";
    const destAcc = tx.destinationAccountId ? data.accountsMap.get(tx.destinationAccountId)?.name || "" : "";
    const personName = tx.personId ? data.peopleMap.get(tx.personId) || "" : "";

    const curr = (tx.sourceCurrency || tx.destinationCurrency || "CNY").toUpperCase();
    const rawAmt = Number(tx.type === "income" ? (tx.destinationAmount || tx.sourceAmount || "0") : (tx.sourceAmount || tx.destinationAmount || "0"));
    const signedAmt = tx.type === "expense" ? -rawAmt : rawAmt;

    const row = worksheet.addRow([
      tx.transactionDate || "",
      tx.transactionTime || "",
      tx.type ? tx.type.replace("_", " ").toUpperCase() : "",
      tx.title || "",
      parentCat,
      childCat,
      fullCat,
      signedAmt,
      curr,
      srcAcc,
      destAcc,
      tx.paymentChannel || "",
      personName,
      tx.personTransferType ? tx.personTransferType.replace(/_/g, " ") : "",
      tx.note || "",
    ]);

    row.font = { size: 9 };

    // Format amount cell
    const amtCell = row.getCell(8);
    amtCell.numFmt = '#,##0.00;[Red]-#,##0.00;"0.00"';
    amtCell.font = { bold: true, size: 9 };
    amtCell.alignment = { horizontal: "right" };

    // Zebra striping
    if (index % 2 === 1) {
      row.eachCell((c) => {
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFBFBFC" },
        };
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFF0F0F0" } },
        bottom: { style: "thin", color: { argb: "FFF0F0F0" } },
        left: { style: "thin", color: { argb: "FFF0F0F0" } },
        right: { style: "thin", color: { argb: "FFF0F0F0" } },
      };
    });
  });

  // AUTO FIT COLUMN WIDTHS
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellVal = cell.value ? String(cell.value) : "";
      if (cellVal.length > maxLength) {
        maxLength = cellVal.length;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  // Explicit width tweaks for key columns
  worksheet.getColumn(1).width = 14; // Date
  worksheet.getColumn(2).width = 10; // Time
  worksheet.getColumn(3).width = 14; // Type
  worksheet.getColumn(4).width = 24; // Title
  worksheet.getColumn(7).width = 22; // Full Category
  worksheet.getColumn(8).width = 16; // Amount
  worksheet.getColumn(15).width = 30; // Note

  // Generate binary and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const dateStr = new Date().toISOString().split("T")[0];
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `MyQian_Transactions_Report_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
