import { fetchImage } from "../backend/services/imageService.js";

export default async function handler(req, res) {

  try {

    let query = req.query.q;
    const subject = req.query.subject || "";

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    query = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .slice(0, 4)
      .join(" ");

    const image = await fetchImage(query, subject);

    return res.status(200).json(image);

  } catch (error) {

    console.error(error);

    return res.json({
      type: "video",
      url: "/images/thinking.mp4"
    });

  }

}