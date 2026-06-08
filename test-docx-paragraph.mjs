import { Paragraph, TextRun } from "docx";

const p = new Paragraph({ children: [new TextRun("Hello")] });
console.log(p.options);
