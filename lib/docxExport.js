import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

/**
 * Utilitas untuk mengekspor dokumen HTML ke format .docx Microsoft Word secara native.
 * @param {string} docTitle Judul dokumen (untuk nama file default)
 * @param {Array<{title: string, html: string}>} sections Daftar bab/bagian yang berisi konten HTML
 */
export async function exportToDocx(docTitle, sections) {
  if (typeof window === "undefined") return;

  const children = [];

  // DOMParser untuk mem-parse HTML string
  const parser = new DOMParser();

  // Helper untuk mem-parse format inline (bold, italic, underline) dari text nodes
  function parseInlineFormatting(node, formatting = {}) {
    const localFormatting = { ...formatting };

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") localFormatting.bold = true;
      if (tag === "em" || tag === "i") localFormatting.italics = true;
      if (tag === "u") localFormatting.underline = {};

      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child, localFormatting));
      }
      return runs;
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (text) {
        return [
          new TextRun({
            text: text,
            bold: localFormatting.bold,
            italics: localFormatting.italics,
            underline: localFormatting.underline,
            font: "Times New Roman",
            size: 24, // 12pt (dalam satuan setengah poin, 24 = 12pt)
            color: "000000",
          }),
        ];
      }
    }
    return [];
  }

  // Helper untuk memproses elemen block dan menambahkannya ke list children docx
  function processBlockNode(node, pageBreakBefore = false, listDepth = 0, isOrdered = false, listIndex = 0) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName.toLowerCase();

    // 1. Heading 1 (Judul Bab)
    if (tag === "h1") {
      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child));
      }
      // Judul Bab: 14pt (size 28), tebal, tengah, uppercase
      runs.forEach((run) => {
        run.options.size = 28;
        run.options.bold = true;
        run.options.text = run.options.text.toUpperCase();
      });

      return new Paragraph({
        children: runs,
        alignment: AlignmentType.CENTER,
        spacing: { before: pageBreakBefore ? 0 : 240, after: 360 }, // After 18pt
        pageBreakBefore: pageBreakBefore,
        keepWithNext: true,
      });
    }

    // 2. Heading 2 (Sub-bab)
    if (tag === "h2") {
      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child));
      }
      // Sub-bab: 12pt (size 24), tebal, justified/left
      runs.forEach((run) => {
        run.options.size = 24;
        run.options.bold = true;
      });

      return new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFY,
        spacing: { before: 360, after: 120 }, // Before 18pt, After 6pt
        keepWithNext: true,
      });
    }

    // 3. Heading 3 (Anak Sub-bab)
    if (tag === "h3") {
      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child));
      }
      // Anak Sub-bab: 12pt (size 24), tebal + miring, justified/left
      runs.forEach((run) => {
        run.options.size = 24;
        run.options.bold = true;
        run.options.italics = true;
      });

      return new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFY,
        spacing: { before: 240, after: 120 }, // Before 12pt, After 6pt
        keepWithNext: true,
      });
    }

    // 4. Paragraf Biasa
    if (tag === "p") {
      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child));
      }
      // Paragraf: 12pt, rata kanan-kiri, spasi baris 1.5 (line: 360 dxa), indentasi baris pertama 1.25cm (709 dxa)
      return new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFY,
        indent: { firstLine: 709 },
        spacing: { after: 240, line: 360, lineRule: "auto" },
      });
    }

    // 5. Unordered List (ul) / Ordered List (ol)
    if (tag === "ul" || tag === "ol") {
      const listItems = [];
      let idx = 1;
      for (const child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "li") {
          const runs = [];
          
          // Prepend Bullet/Numbering secara manual agar kompatibel di semua versi MS Word
          const prefixText = tag === "ol" ? `${idx}. ` : "• ";
          runs.push(
            new TextRun({
              text: prefixText,
              font: "Times New Roman",
              size: 24,
              bold: tag === "ol",
              color: "000000",
            })
          );

          for (const itemChild of child.childNodes) {
            runs.push(...parseInlineFormatting(itemChild));
          }

          listItems.push(
            new Paragraph({
              children: runs,
              alignment: AlignmentType.JUSTIFY,
              indent: { left: (listDepth + 1) * 360 }, // Indentasi list
              spacing: { after: 120, line: 360, lineRule: "auto" },
            })
          );
          idx++;
        }
      }
      return listItems;
    }

    // 6. Tabel (table)
    if (tag === "table") {
      const rows = [];
      for (const tr of node.childNodes) {
        if (tr.nodeType === Node.ELEMENT_NODE && tr.tagName.toLowerCase() === "tr") {
          const cells = [];
          for (const td of tr.childNodes) {
            if (
              td.nodeType === Node.ELEMENT_NODE &&
              (td.tagName.toLowerCase() === "td" || td.tagName.toLowerCase() === "th")
            ) {
              const runs = [];
              const isTh = td.tagName.toLowerCase() === "th";
              
              for (const child of td.childNodes) {
                runs.push(...parseInlineFormatting(child));
              }

              if (isTh) {
                runs.forEach((r) => {
                  r.options.bold = true;
                });
              }

              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: runs,
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 0, line: 240 }, // Single space inside table cell
                    }),
                  ],
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                  },
                  width: { size: 100, type: WidthType.PERCENTAGE },
                })
              );
            }
          }
          if (cells.length > 0) {
            rows.push(new TableRow({ children: cells }));
          }
        }
      }
      if (rows.length > 0) {
        return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
      }
    }

    // Fallback: Elemen pembungkus div, section, dsb.
    if (tag === "div" || tag === "section" || tag === "article" || tag === "span") {
      const blockChildren = [];
      for (const child of node.childNodes) {
        const parsed = processBlockNode(child, false, listDepth, isOrdered);
        if (parsed) {
          if (Array.isArray(parsed)) blockChildren.push(...parsed);
          else blockChildren.push(parsed);
        }
      }
      return blockChildren;
    }

    return null;
  }

  // Iterasi di setiap section/bab dan tambahkan elemen ke Document children
  sections.forEach((sec, secIdx) => {
    // 1. Tambahkan Judul Bab/Section
    const chapterDoc = parser.parseFromString(sec.html || "", "text/html");

    // Elemen heading utama bab
    const titleRuns = [
      new TextRun({
        text: sec.title.toUpperCase(),
        bold: true,
        font: "Times New Roman",
        size: 28, // 14pt
        color: "000000",
      }),
    ];

    children.push(
      new Paragraph({
        children: titleRuns,
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 360 }, // After 18pt
        pageBreakBefore: secIdx > 0, // Page break di depan bab baru (kecuali bab pertama)
        keepWithNext: true,
      })
    );

    // 2. Parse sisa elemen HTML dari bab tersebut
    for (const child of chapterDoc.body.childNodes) {
      // Lewati elemen heading bab itu sendiri jika sudah ter-render di atas
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "h1") {
        continue;
      }
      
      const parsed = processBlockNode(child, false);
      if (parsed) {
        if (Array.isArray(parsed)) {
          children.push(...parsed);
        } else {
          children.push(parsed);
        }
      }
    }
  });

  // Buat objek Document docx dengan spesifikasi lengkap
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 2268,    // 4 cm (twips: 4 * 567)
              bottom: 1701, // 3 cm
              left: 2268,   // 4 cm
              right: 1701,  // 3 cm
            },
          },
        },
        children: children,
      },
    ],
  });

  // Pack document ke Blob
  const blob = await Packer.toBlob(doc);
  
  // Download file docx ke browser
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${docTitle.replace(/\s+/g, "_")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
