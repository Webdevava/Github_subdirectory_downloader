const axios = require("axios");
const JSZip = require("jszip");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { repoUrl, subDir } = req.body;
  if (!repoUrl || !subDir) {
    return res
      .status(400)
      .json({ error: "Repository URL and subdirectory path are required." });
  }

  try {
    const [, owner, repo] = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${subDir}`;
    const response = await axios.get(apiUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    const zip = new JSZip();
    for (const file of response.data) {
      if (file.type === "file") {
        const fileResponse = await axios.get(file.download_url, {
          responseType: "arraybuffer",
        });
        zip.file(file.name, fileResponse.data);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=subdir.zip");
    res.send(zipBuffer);
  } catch (error) {
    console.error("API Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    res
      .status(500)
      .json({ error: `Error downloading the subdirectory: ${error.message}` });
  }
};
