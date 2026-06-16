import { fetchImage } from "../backend/services/imageService.js";
import { checkRateLimit, validateImageRequest } from "../backend/services/apiSecurity.js";

export default async function handler(req, res) {

  try {

    if (!checkRateLimit(req, res, {
      key: "api-image",
      max: 20,
      windowMs: 60_000,
      message: "Too many image lookups. Try again in a minute."
    })) {
      return;
    }

    const parsedRequest = validateImageRequest(req.query.q, req.query.subject || "");

    if (!parsedRequest.ok) {
      return res.status(400).json({ error: parsedRequest.error });
    }

    const { query, subject } = parsedRequest.value;

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