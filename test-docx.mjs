import { Document, Packer, Paragraph, TextRun, UnderlineType } from "docx";

async function test() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Hello",
                underline: {},
              }),
            ],
          }),
        ],
      },
    ],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    console.log("Success! Buffer size:", buffer.length);
  } catch (e) {
    console.error("Error packing document:", e);
  }
}

test();
