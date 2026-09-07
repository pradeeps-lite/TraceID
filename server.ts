import "dotenv/config";
import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { processAndAnalyzeUpload, getStoredImage, getFaceCropBuffer, updateStoredImageFaceDetection } from "./server/services/image_analysis.js";
import { FaceDetectionService } from "./server/services/face_detection_service.js";
import { SearchService } from "./server/services/search_service.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS middleware - support cross-origin iframe requests & preflight OPTIONS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  const searchService = new SearchService();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "TRACE ID",
      timestamp: new Date().toISOString(),
    });
  });

  // Provider configuration & capabilities status
  app.get("/api/config-status", (_req, res) => {
    const status = searchService.getProviderConfigStatus();
    res.json(status);
  });

  // Serve stored image by secure imageId
  app.get("/api/image/:id", (req, res) => {
    const stored = getStoredImage(req.params.id);
    if (!stored) {
      res.status(404).json({ error: "Image not found or expired" });
      return;
    }
    res.setHeader("Content-Type", stored.mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(stored.buffer);
  });

  // Serve cropped face image by imageId and faceIndex
  app.get("/api/face-crop/:id/:index", async (req, res) => {
    try {
      const faceIndex = parseInt(req.params.index, 10) || 1;
      const crop = await getFaceCropBuffer(req.params.id, faceIndex);
      if (!crop) {
        res.status(404).json({ error: "Face crop not found or face index invalid" });
        return;
      }
      res.setHeader("Content-Type", crop.mimeType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(crop.buffer);
    } catch (err: any) {
      console.error("Error serving face crop:", err);
      res.status(500).json({ error: "Failed to extract face crop" });
    }
  });

  // POST /api/detect-faces - non-blocking dedicated face detection endpoint
  app.post("/api/detect-faces", async (req, res) => {
    try {
      const { imageId } = req.body;
      if (!imageId || typeof imageId !== "string") {
        res.status(400).json({ error: "INVALID_REQUEST", message: "imageId string is required." });
        return;
      }

      const stored = getStoredImage(imageId);
      if (!stored) {
        res.status(404).json({ error: "IMAGE_NOT_FOUND", message: "Image not found or expired." });
        return;
      }

      if (stored.faceDetection) {
        res.json(stored.faceDetection);
        return;
      }

      const faceDetector = FaceDetectionService.getInstance();
      const result = await faceDetector.detectFaces(stored.buffer, true);
      updateStoredImageFaceDetection(imageId, result);

      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/detect-faces:", err);
      res.status(500).json({
        hasFaces: false,
        faceCount: 0,
        detectedAt: new Date().toISOString(),
        detectionDurationMs: 0,
        regions: [],
        summary: "Face detection encountered an unexpected issue.",
        focusTarget: "scene",
        engine: "OpenCV (Haar Cascades)",
      });
    }
  });

  // POST /api/analyze - accepts file or base64
  app.post(
    "/api/analyze",
    (req, res, next) => {
      upload.single("image")(req as any, res as any, (err: any) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              error: "FILE_TOO_LARGE",
              message: "File exceeds 25MB limit. Please upload a smaller image.",
            });
          }
          return res.status(400).json({
            error: "UPLOAD_ERROR",
            message: err.message || "Failed to process image upload.",
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        let buffer: Buffer | null = null;
        let mimeType = "image/jpeg";

        if (req.file) {
          buffer = req.file.buffer;
          mimeType = req.file.mimetype || "image/jpeg";
        } else if (req.body?.imageBase64 || req.body?.image) {
          let rawBase64 = req.body.imageBase64 || req.body.image;
          const match = rawBase64.match(/^data:([^;]+);base64,(.*)$/);
          if (match) {
            mimeType = match[1];
            rawBase64 = match[2];
          }
          buffer = Buffer.from(rawBase64, "base64");
        }

        if (!buffer || buffer.length === 0) {
          res.status(400).json({
            error: "INVALID_IMAGE",
            message: "No image file or imageBase64 payload provided in request.",
          });
          return;
        }

        const result = await processAndAnalyzeUpload(buffer, mimeType);
        res.json(result);
      } catch (err: any) {
        console.error("Error in /api/analyze:", err);
        const isValidation = err.message?.startsWith("INVALID_IMAGE");
        res.status(isValidation ? 400 : 500).json({
          error: isValidation ? "INVALID_IMAGE" : "IMAGE_PROCESSING_ERROR",
          message: err.message || "Failed to process uploaded image.",
        });
      }
    }
  );

  // POST /api/search - input: { imageId: string, searchTarget?: 'full' | 'face', faceIndex?: number }
  app.post("/api/search", async (req, res) => {
    try {
      const { imageId, searchTarget = "full", faceIndex = 1 } = req.body;
      if (!imageId || typeof imageId !== "string") {
        res.status(400).json({
          error: "INVALID_REQUEST",
          message: "imageId string is required.",
        });
        return;
      }

      const stored = getStoredImage(imageId);
      if (!stored) {
        res.status(404).json({
          error: "IMAGE_NOT_FOUND",
          message: "The requested imageId does not exist or has expired. Please upload the image again.",
        });
        return;
      }

      let searchBuffer = stored.buffer;
      let searchMime = stored.mimeType;
      let searchHash = stored.hash;

      // If user requested face-targeted trace, isolate the face region and eliminate dresses/clothing
      if (searchTarget === "face") {
        try {
          const faceCrop = await getFaceCropBuffer(imageId, Number(faceIndex) || 1);
          if (faceCrop) {
            searchBuffer = faceCrop.buffer;
            searchMime = faceCrop.mimeType;
            searchHash = crypto.createHash("sha256").update(faceCrop.buffer).digest("hex");
            console.log(`[Search] Executing face-isolated visual search on face #${faceIndex} (SHA: ${searchHash.slice(0, 10)}...)`);
          }
        } catch (cropErr) {
          console.warn("Face crop retrieval notice for search, falling back to full image:", cropErr);
        }
      }

      const response = await searchService.searchImage(
        searchHash,
        searchBuffer,
        searchMime
      );

      res.json(response);
    } catch (err: any) {
      console.error("Error in /api/search:", err);
      res.status(500).json({
        status: "error",
        error: "SEARCH_SERVICE_ERROR",
        message: err.message || "Unexpected error while executing visual search.",
      });
    }
  });

  // Strict JSON 404 handler for any unmatched /api routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: `API route ${req.method} ${req.originalUrl} not found.`,
    });
  });

  // Global JSON error handler for all /api routes
  app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("API Error Middleware caught:", err);
    const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
    res.status(status).json({
      error: err.code || "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred while processing the request.",
    });
  });

  // Mount Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TRACE ID Server running on http://0.0.0.0:${PORT}`);
    const diag = searchService.getProviderConfigStatus();
    console.log("============================================================");
    console.log("TRACE ID Provider:");
    console.log("SERPAPI / GOOGLE LENS");
    console.log("SERPAPI_API_KEY:");
    console.log(diag.serpApiKeyStatus);
    console.log("Google Cloud Vision:");
    console.log("DISABLED");
    console.log("TinEye:");
    console.log("DISABLED");
    console.log("MAX RESULTS:");
    console.log(diag.maxResults);
    console.log("============================================================");
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup failure:", err);
  process.exit(1);
});
