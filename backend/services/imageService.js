import axios from "axios";

export async function fetchImage(query, subject) {

  // 1️⃣ Try Wikimedia (best for educational topics)

  try {

    const wiki = await axios.get(
      "https://en.wikipedia.org/w/api.php",
      {
        params: {
          action: "query",
          generator: "search",
          gsrsearch: query,
          gsrlimit: 1,
          prop: "pageimages",
          piprop: "original",
          format: "json"
        }
      }
    );

    const pages = wiki.data?.query?.pages;

    if (pages) {
      const page = Object.values(pages)[0];
      if (page?.original?.source) {
        return {
          type: "image",
          url: page.original.source
        };
      }
    }

  } catch {}

  // 2️⃣ Try Pexels

  try {

    const pexels = await axios.get(
      "https://api.pexels.com/v1/search",
      {
        params: { query, per_page: 1 },
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    if (pexels.data.photos.length) {
      return {
        type: "image",
        url: pexels.data.photos[0].src.medium
      };
    }

  } catch {}

  // 3️⃣ Try Unsplash fallback

  try {

    const unsplash = await axios.get(
      "https://api.unsplash.com/photos/random",
      {
        params: { query },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    if (unsplash.data?.urls?.small) {
      return {
        type: "image",
        url: unsplash.data.urls.small
      };
    }

  } catch {}

  // 4️⃣ Final fallback

  return {
    type: "fallback",
    url: "/assets/images/thinking.png"
  };

}