import { Paragraph, TextRun } from "docx";

const p = new Paragraph({ children: [new TextRun("Hello")], indent: { left: 100 } });
console.log(JSON.stringify(p, null, 2));
