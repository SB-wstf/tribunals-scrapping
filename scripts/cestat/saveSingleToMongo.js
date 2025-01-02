import Cestat from "./schema.js";
export default async function saveSingleToMongo(pdf) {
  const newDocument = new Cestat(pdf);
  try {
    await newDocument.save();
  } catch (error) {
    console.error("Error saving document:", error);
  }
}
