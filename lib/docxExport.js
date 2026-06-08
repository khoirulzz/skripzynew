import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ImageRun,
  LineRuleType
} from "docx";

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

  // Helper to load image data to Uint8Array or ArrayBuffer
  async function loadImageData(src) {
    if (src.startsWith("data:")) {
      try {
        const parts = src.split(",");
        const base64 = parts[1];
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
      } catch (e) {
        console.error("Failed to parse base64 image data", e);
        return null;
      }
    } else {
      // External URL or relative URL
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        return await blob.arrayBuffer();
      } catch (e) {
        console.error("Failed to fetch image: " + src, e);
        return null;
      }
    }
  }

  function isBlockTag(tag) {
    const blockTags = [
      "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
      "blockquote", "table", "div", "section", "article", "aside", "hr", "img"
    ];
    return blockTags.includes(tag);
  }

  function hasBlockChildren(node) {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (isBlockTag(tag)) {
          return true;
        }
      }
    }
    return false;
  }

  // Helper untuk mem-parse format inline (bold, italic, underline, dsb.) dari text nodes
  function parseInlineFormatting(node, formatting = {}) {
    const localFormatting = { ...formatting };

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag === "strong" || tag === "b") localFormatting.bold = true;
      if (tag === "em" || tag === "i") localFormatting.italics = true;
      if (tag === "u") localFormatting.underline = {};
      if (tag === "s" || tag === "del" || tag === "strike") localFormatting.strike = true;
      if (tag === "sub") localFormatting.subScript = true;
      if (tag === "sup") localFormatting.superScript = true;
      if (tag === "mark") localFormatting.highlight = "yellow";
      if (tag === "a") {
        localFormatting.color = "0563C1";
        localFormatting.underline = {};
      }
      if (tag === "br") {
        return [new TextRun({ break: 1 })];
      }

      const runs = [];
      for (const child of node.childNodes) {
        runs.push(...parseInlineFormatting(child, localFormatting));
      }
      return runs;
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (text) {
        let textVal = text;
        if (localFormatting.uppercase) {
          textVal = textVal.toUpperCase();
        }
        return [
          new TextRun({
            text: textVal,
            bold: localFormatting.bold,
            italics: localFormatting.italics,
            underline: localFormatting.underline,
            strike: localFormatting.strike,
            superScript: localFormatting.superScript,
            subScript: localFormatting.subScript,
            highlight: localFormatting.highlight,
            font: "Times New Roman",
            size: localFormatting.size || 24, // 12pt (dalam satuan setengah poin, 24 = 12pt)
            color: localFormatting.color || "000000",
          }),
        ];
      }
    }
    return [];
  }

  async function parseCellContent(cellNode, isTh) {
    const cellChildren = [];
    let currentInlineRuns = [];

    function flushInlineRuns() {
      if (currentInlineRuns.length > 0) {
        cellChildren.push(
          new Paragraph({
            children: currentInlineRuns,
            alignment: AlignmentType.LEFT,
            spacing: { after: 0, line: 240 },
          })
        );
        currentInlineRuns = [];
      }
    }

    for (const child of cellNode.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childTag = child.tagName.toLowerCase();
        if (isBlockTag(childTag)) {
          flushInlineRuns();
          const block = await processBlockNode(child, false);
          if (block) {
            if (Array.isArray(block)) {
              cellChildren.push(...block);
            } else {
              cellChildren.push(block);
            }
          }
        } else {
          currentInlineRuns.push(...parseInlineFormatting(child, { bold: isTh }));
        }
      } else if (child.nodeType === Node.TEXT_NODE) {
        currentInlineRuns.push(...parseInlineFormatting(child, { bold: isTh }));
      }
    }
    flushInlineRuns();

    // TableCell children must never be empty
    if (cellChildren.length === 0) {
      cellChildren.push(
        new Paragraph({
          children: [new TextRun("")],
          spacing: { after: 0, line: 240 },
        })
      );
    }
    return cellChildren;
  }

  // Helper untuk memproses elemen block dan menambahkannya ke list children docx
  async function processBlockNode(node, pageBreakBefore = false, listDepth = 0, isOrdered = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      const runs = parseInlineFormatting(node);
      if (runs.length > 0) {
        return new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFY,
          spacing: { after: 240, line: 360, lineRule: LineRuleType.AUTO },
        });
      }
      return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName.toLowerCase();

    // 1. Heading 1 (Judul Bab)
    if (tag === "h1") {
      const runs = parseInlineFormatting(node, { size: 28, bold: true, uppercase: true });
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
      const runs = parseInlineFormatting(node, { size: 24, bold: true });
      return new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFY,
        spacing: { before: 360, after: 120 }, // Before 18pt, After 6pt
        keepWithNext: true,
      });
    }

    // 3. Heading 3 (Anak Sub-bab)
    if (tag === "h3") {
      const runs = parseInlineFormatting(node, { size: 24, bold: true, italics: true });
      return new Paragraph({
        children: runs,
        alignment: AlignmentType.JUSTIFY,
        spacing: { before: 240, after: 120 }, // Before 12pt, After 6pt
        keepWithNext: true,
      });
    }

    // 4. Horizontal Rule (hr)
    if (tag === "hr") {
      return new Paragraph({
        border: {
          bottom: {
            color: "CCCCCC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { before: 120, after: 120 },
      });
    }

    // 5. Image (img)
    if (tag === "img") {
      const src = node.getAttribute("src");
      if (src) {
        let width = 300;
        let height = 200;
        if (node.getAttribute("width")) {
          width = parseInt(node.getAttribute("width"), 10);
        }
        if (node.getAttribute("height")) {
          height = parseInt(node.getAttribute("height"), 10);
        }
        const style = node.getAttribute("style") || "";
        const widthMatch = style.match(/width:\s*(\d+)px/);
        if (widthMatch) width = parseInt(widthMatch[1], 10);
        const heightMatch = style.match(/height:\s*(\d+)px/);
        if (heightMatch) height = parseInt(heightMatch[1], 10);

        const data = await loadImageData(src);
        if (data) {
          return new Paragraph({
            children: [
              new ImageRun({
                data: data,
                transformation: {
                  width: width,
                  height: height,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          });
        }
      }
      return null;
    }

    // 6. Blockquote
    if (tag === "blockquote") {
      const blockquoteChildren = [];
      for (const child of node.childNodes) {
        const parsed = await processBlockNode(child, false, listDepth, isOrdered);
        if (parsed) {
          const items = Array.isArray(parsed) ? parsed : [parsed];
          items.forEach((item) => {
            if (item instanceof Paragraph) {
              item.options.indent = { ...item.options.indent, left: 720 };
              item.options.border = {
                left: {
                  color: "CCCCCC",
                  space: 12,
                  style: BorderStyle.SINGLE,
                  size: 24, // 3pt
                },
              };
            }
          });
          blockquoteChildren.push(...items);
        }
      }
      return blockquoteChildren;
    }

    // 7. Unordered List (ul) / Ordered List (ol)
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

          if (hasBlockChildren(child)) {
            let isFirst = true;
            for (const liChild of child.childNodes) {
              const parsed = await processBlockNode(liChild, false, listDepth + 1, tag === "ol");
              if (parsed) {
                const items = Array.isArray(parsed) ? parsed : [parsed];
                items.forEach((item) => {
                  if (item instanceof Paragraph) {
                    if (isFirst) {
                      item.options.children.unshift(...runs);
                      isFirst = false;
                    }
                    item.options.indent = { ...item.options.indent, left: (listDepth + 1) * 360 };
                  }
                  listItems.push(item);
                });
              }
            }
          } else {
            const inlineRuns = parseInlineFormatting(child);
            runs.push(...inlineRuns);
            listItems.push(
              new Paragraph({
                children: runs,
                alignment: AlignmentType.JUSTIFY,
                indent: { left: (listDepth + 1) * 360 }, // Indentasi list
                spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO },
              })
            );
          }
          idx++;
        }
      }
      return listItems;
    }

    // 8. Tabel (table)
    if (tag === "table") {
      const rows = [];
      const trElements = [];
      
      function findTrs(parent) {
        for (const child of parent.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childTag = child.tagName.toLowerCase();
            if (childTag === "tr") {
              trElements.push(child);
            } else if (childTag === "tbody" || childTag === "thead" || childTag === "tfoot") {
              findTrs(child);
            }
          }
        }
      }
      findTrs(node);

      for (const tr of trElements) {
        const cells = [];
        const directCells = Array.from(tr.childNodes).filter(
          (c) => c.nodeType === Node.ELEMENT_NODE && (c.tagName.toLowerCase() === "td" || c.tagName.toLowerCase() === "th")
        );
        const cellWidth = 100 / (directCells.length || 1);

        for (const cell of directCells) {
          const isTh = cell.tagName.toLowerCase() === "th";
          const cellChildren = await parseCellContent(cell, isTh);
          
          cells.push(
            new TableCell({
              children: cellChildren,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              },
              width: { size: cellWidth, type: WidthType.PERCENTAGE },
            })
          );
        }
        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
      }

      if (rows.length > 0) {
        return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
      }
      return null;
    }

    // 9. Fallback: Elemen pembungkus div, section, dsb. atau tag paragraf / tidak dikenal
    if (hasBlockChildren(node)) {
      const blockChildren = [];
      for (const child of node.childNodes) {
        const parsed = await processBlockNode(child, false, listDepth, isOrdered);
        if (parsed) {
          if (Array.isArray(parsed)) blockChildren.push(...parsed);
          else blockChildren.push(parsed);
        }
      }
      return blockChildren;
    } else {
      const runs = parseInlineFormatting(node);
      if (runs.length > 0) {
        return new Paragraph({
          children: runs,
          alignment: AlignmentType.JUSTIFY,
          indent: { firstLine: tag === "p" ? 709 : 0 },
          spacing: { after: 240, line: 360, lineRule: LineRuleType.AUTO },
        });
      }
    }

    return null;
  }

  // Iterasi di setiap section/bab dan tambahkan elemen ke Document children secara asinkron
  for (let secIdx = 0; secIdx < sections.length; secIdx++) {
    const sec = sections[secIdx];
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
      
      const parsed = await processBlockNode(child, false);
      if (parsed) {
        if (Array.isArray(parsed)) {
          children.push(...parsed);
        } else {
          children.push(parsed);
        }
      }
    }
  }

  // Fallback: Pastikan children tidak kosong agar tidak terjadi crash saat di-pack
  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Dokumen kosong.",
            font: "Times New Roman",
            size: 24,
          }),
        ],
      })
    );
  }

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
